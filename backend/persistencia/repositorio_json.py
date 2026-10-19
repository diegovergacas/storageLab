import json
import uuid
from pathlib import Path

from backend.dominio.codigo import variantes
from backend.dominio.item import CAMPOS_BASE, agora, compactar_codigo, item_visto, posicao_estoque, produto_catalogo
from backend.persistencia.planilha_compras import PLANILHA, ler_compras

FOTO_TIPOS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class RepositorioJson:
    def __init__(self, catalogo: Path, estoque: Path, fotos: Path, pedidos: Path | None = None) -> None:
        self.catalogo_path = catalogo
        self.estoque_path = estoque
        self.pedidos_path = pedidos or catalogo.with_name("pedidos.json")
        self.fotos = fotos
        self.catalogo_path.parent.mkdir(parents=True, exist_ok=True)
        self.fotos.mkdir(parents=True, exist_ok=True)
        self._migrar_se_preciso()
        self.importar_planilha()

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

    def entrada(self, codigo: str, quantidade: int = 1) -> dict | None:
        if quantidade < 1:
            raise ValueError("A quantidade de entrada deve ser maior que zero")
        produtos = self._produtos()
        produto = self._achar(produtos, codigo)
        if produto is None:
            return None
        posicoes = self._posicoes()
        posicao = self._achar(posicoes, codigo)
        if posicao is None:
            posicoes.insert(0, posicao_estoque(produto["codigo"], quantidade, 0))
        else:
            posicao["prateleira"] = int(posicao.get("prateleira", 0)) + quantidade
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
        for campo in CAMPOS_BASE:
            if campo in campos:
                produto[campo] = str(campos.get(campo) or "").strip()
        if produto.get("empresa") and not produto.get("marca"):
            produto["marca"] = produto["empresa"]
        self._gravar_produtos(produtos)
        return self._juntar(produto)

    def ja_importou_planilha(self) -> bool:
        return any(p.get("origem") == "planilha" for p in self._produtos())

    def listar_pendentes(self) -> list[dict]:
        posicoes = self._posicoes()
        return [
            self._juntar(produto, posicoes)
            for produto in self._produtos()
            if produto.get("pendente_codigo") or str(produto.get("codigo", "")).startswith("PLAN-")
        ]

    def importar_planilha(self, caminho: Path | None = None, forcar: bool = False) -> dict:
        arquivo = caminho or PLANILHA
        if not arquivo.exists():
            return {"produtos_novos": 0, "produtos_atualizados": 0, "pedidos": 0}
        lido = ler_compras(arquivo)
        produtos = self._produtos()
        posicoes = self._posicoes()
        existentes = {p["codigo"]: p for p in produtos}
        novos = 0
        atualizados = 0
        for produto in lido["produtos"]:
            atual = existentes.get(produto["codigo"])
            if atual is None:
                produtos.append(produto_catalogo(produto))
                posicoes.append(posicao_estoque(produto["codigo"], 0, 0))
                existentes[produto["codigo"]] = produtos[-1]
                novos += 1
                continue
            mudou = False
            for campo in ("nome", "marca", *CAMPOS_BASE):
                valor = produto.get(campo)
                limpar_moeda = forcar and campo in {"valor_brl", "valor_usd"}
                if not valor and not limpar_moeda:
                    continue
                if forcar or not str(atual.get(campo) or "").strip():
                    if atual.get(campo) != valor:
                        atual[campo] = valor
                        mudou = True
            atual["origem"] = atual.get("origem") or "planilha"
            if str(atual.get("codigo", "")).startswith("PLAN-"):
                atual["pendente_codigo"] = True
            if mudou:
                atualizados += 1
        self._gravar_produtos(produtos)
        self._gravar_posicoes(posicoes)
        if forcar or not self.pedidos_path.exists():
            self._gravar(self.pedidos_path, {"pedidos": lido["pedidos"]})
        return {"produtos_novos": novos, "produtos_atualizados": atualizados, "pedidos": len(lido["pedidos"])}

    def vincular(self, codigo_interno: str, codigo_barras: str, tipo: str = "codigo", entrada: bool = True) -> dict | None:
        barras = compactar_codigo(codigo_barras)
        if not barras:
            raise ValueError("Codigo de barras vazio")
        if self.buscar(barras) is not None:
            raise ValueError("Esse codigo de barras ja esta em outro produto")
        produtos = self._produtos()
        produto = self._achar(produtos, codigo_interno)
        if produto is None:
            return None
        posicoes = self._posicoes()
        posicao = self._achar(posicoes, codigo_interno)
        produto["codigo"] = barras
        produto["tipo"] = tipo
        produto["pendente_codigo"] = False
        if posicao is not None:
            posicao["codigo"] = barras
            posicao["atualizado_em"] = agora()
            if entrada:
                posicao["prateleira"] = int(posicao.get("prateleira", 0)) + 1
        else:
            posicoes.insert(0, posicao_estoque(barras, 1 if entrada else 0, 0))
        self._gravar_produtos(produtos)
        self._gravar_posicoes(posicoes)
        return self._juntar(produto, posicoes)

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
