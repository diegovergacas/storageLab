import json
import uuid
from pathlib import Path

from backend.dominio.item import agora, codigo_chave, item_novo

FOTO_TIPOS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class RepositorioJson:
    def __init__(self, caminho: Path, fotos: Path) -> None:
        self.caminho = caminho
        self.fotos = fotos
        self.caminho.parent.mkdir(parents=True, exist_ok=True)
        self.fotos.mkdir(parents=True, exist_ok=True)
        if not self.caminho.exists():
            self._gravar({"itens": []})

    def _ler(self) -> dict:
        return json.loads(self.caminho.read_text(encoding="utf-8"))

    def _gravar(self, dados: dict) -> None:
        self.caminho.write_text(
            json.dumps(dados, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def listar(self) -> list[dict]:
        return self._ler()["itens"]

    def buscar(self, codigo: str) -> dict | None:
        chave = codigo_chave(codigo)
        for item in self.listar():
            if item["codigo"] == chave:
                return item
        return None

    def entrada(self, codigo: str) -> dict | None:
        chave = codigo_chave(codigo)
        dados = self._ler()
        for item in dados["itens"]:
            if item["codigo"] == chave:
                item["prateleira"] = int(item.get("prateleira", 0)) + 1
                item["atualizado_em"] = agora()
                self._gravar(dados)
                return item
        return None

    def cadastrar(self, novo: dict) -> dict:
        existente = self.entrada(novo["codigo"])
        if existente is not None:
            return existente
        item = item_novo(novo)
        dados = self._ler()
        dados["itens"].insert(0, item)
        self._gravar(dados)
        return item

    def salvar_foto(self, conteudo: bytes, content_type: str) -> str:
        ext = FOTO_TIPOS.get(content_type, ".jpg")
        nome = f"{uuid.uuid4().hex}{ext}"
        (self.fotos / nome).write_bytes(conteudo)
        return nome
