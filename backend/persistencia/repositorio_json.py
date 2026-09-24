import json
import uuid
from pathlib import Path

from backend.dominio.codigo import variantes
from backend.dominio.item import agora, item_visto, posicao_estoque, produto_catalogo

FOTO_TIPOS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class RepositorioJson:
    def __init__(self, catalogo: Path, estoque: Path, fotos: Path) -> None:
        self.catalogo_path = catalogo
        self.estoque_path = estoque
        self.fotos = fotos
        self.catalogo_path.parent.mkdir(parents=True, exist_ok=True)
        self.fotos.mkdir(parents=True, exist_ok=True)
        self._migrar_se_preciso()

    def _ler(self, caminho: Path, chave: str) -> dict:
        if not caminho.exists():
            return {chave: []}
        return json.loads(caminho.read_text(encoding="utf-8"))

    def _gravar(self, caminho: Path, dados: dict) -> None:
        caminho.write_text(
            json.dumps(dados, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _migrar_se_preciso(self) -> None:
        estoque = self._ler(self.estoque_path, "itens")
        if self.catalogo_path.exists():
            return
        produtos = []
        posicoes = []
        for item in estoque.get("itens", []):
            produtos.append(produto_catalogo(item))
            posicoes.append(
                posicao_estoque(
                    item["codigo"],
                    item.get("prateleira", 0),
                    item.get("emprestado", 0),
                )
            )
        self._gravar(self.catalogo_path, {"produtos": produtos})
        self._gravar(self.estoque_path, {"itens": posicoes})

    def _produtos(self) -> list[dict]:
        return self._ler(self.catalogo_path, "produtos").get("produtos", [])

    def _posicoes(self) -> list[dict]:
        return self._ler(self.estoque_path, "itens").get("itens", [])

    def _achar(self, itens: list[dict], codigo: str) -> dict | None:
        candidatos = variantes(codigo)
        for item in itens:
            if variantes(item["codigo"]) & candidatos:
                return item
        return None

    def _gravar_produtos(self, produtos: list[dict]) -> None:
        self._gravar(self.catalogo_path, {"produtos": produtos})

    def _gravar_posicoes(self, posicoes: list[dict]) -> None:
        self._gravar(self.estoque_path, {"itens": posicoes})

    def _juntar(self, produto: dict, posicoes: list[dict] | None = None) -> dict:
        return item_visto(produto, self._achar(posicoes or self._posicoes(), produto["codigo"]))

    def listar(self) -> list[dict]:
        posicoes = self._posicoes()
        return [self._juntar(produto, posicoes) for produto in self._produtos()]

    def buscar(self, codigo: str) -> dict | None:
        produto = self._achar(self._produtos(), codigo)
        if produto is None:
            return None
        return self._juntar(produto)

    def entrada(self, codigo: str) -> dict | None:
        produtos = self._produtos()
        produto = self._achar(produtos, codigo)
        if produto is None:
            return None
        posicoes = self._posicoes()
        posicao = self._achar(posicoes, codigo)
        if posicao is None:
            posicoes.insert(0, posicao_estoque(produto["codigo"], 1, 0))
        else:
            posicao["prateleira"] = int(posicao.get("prateleira", 0)) + 1
            posicao["atualizado_em"] = agora()
        self._gravar_posicoes(posicoes)
        return self._juntar(produto, posicoes)

    def emprestar(self, codigo: str) -> dict | None:
        produto = self._achar(self._produtos(), codigo)
        if produto is None:
            return None
        posicoes = self._posicoes()
        posicao = self._achar(posicoes, codigo)
        if posicao is None or int(posicao.get("prateleira", 0)) < 1:
            raise ValueError("Nao ha item na prateleira para emprestar")
        posicao["prateleira"] = int(posicao["prateleira"]) - 1
        posicao["emprestado"] = int(posicao.get("emprestado", 0)) + 1
        posicao["atualizado_em"] = agora()
        self._gravar_posicoes(posicoes)
        return self._juntar(produto, posicoes)

    def acabou(self, codigo: str) -> dict | None:
        produto = self._achar(self._produtos(), codigo)
        if produto is None:
            return None
        posicoes = self._posicoes()
        posicao = self._achar(posicoes, codigo)
        if posicao is None or int(posicao.get("prateleira", 0)) < 1:
            raise ValueError("Nao ha item na prateleira para dar baixa")
        posicao["prateleira"] = int(posicao["prateleira"]) - 1
        posicao["atualizado_em"] = agora()
        self._gravar_posicoes(posicoes)
        return self._juntar(produto, posicoes)

    def devolver(self, codigo: str) -> dict | None:
        produto = self._achar(self._produtos(), codigo)
        if produto is None:
            return None
        posicoes = self._posicoes()
        posicao = self._achar(posicoes, codigo)
        if posicao is None or int(posicao.get("emprestado", 0)) < 1:
            raise ValueError("Nao ha item emprestado para devolver")
        posicao["emprestado"] = int(posicao["emprestado"]) - 1
        posicao["prateleira"] = int(posicao.get("prateleira", 0)) + 1
        posicao["atualizado_em"] = agora()
        self._gravar_posicoes(posicoes)
        return self._juntar(produto, posicoes)

    def editar(self, codigo: str, campos: dict) -> dict | None:
        produtos = self._produtos()
        produto = self._achar(produtos, codigo)
        if produto is None:
            return None
        if campos.get("nome"):
            produto["nome"] = campos["nome"].strip()
        if "marca" in campos:
            produto["marca"] = (campos.get("marca") or "").strip()
        self._gravar_produtos(produtos)
        return self._juntar(produto)

    def cadastrar(self, novo: dict) -> dict:
        existente = self.entrada(novo["codigo"])
        if existente is not None:
            return existente
        produto = produto_catalogo(novo)
        produtos = self._produtos()
        produtos.insert(0, produto)
        self._gravar_produtos(produtos)
        posicoes = self._posicoes()
        posicoes.insert(0, posicao_estoque(produto["codigo"], 1, 0))
        self._gravar_posicoes(posicoes)
        return self._juntar(produto, posicoes)

    def salvar_foto(self, conteudo: bytes, content_type: str) -> str:
        ext = FOTO_TIPOS.get(content_type, ".jpg")
        nome = f"{uuid.uuid4().hex}{ext}"
        (self.fotos / nome).write_bytes(conteudo)
        return nome
