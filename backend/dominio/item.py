import re
from datetime import datetime, timezone


def agora() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def codigo_chave(codigo: str) -> str:
    return re.sub(r"\s+", "", codigo).strip()


def compactar_codigo(codigo: str) -> str:
    from backend.dominio.codigo import codigo_chave as normalizar

    return normalizar(codigo)


def produto_catalogo(dados: dict) -> dict:
    momento = agora()
    return {
        "codigo": compactar_codigo(dados["codigo"]),
        "tipo": (dados.get("tipo") or "desconhecido").strip(),
        "nome": dados["nome"].strip(),
        "marca": (dados.get("marca") or "").strip(),
        "foto": dados.get("foto"),
        "criado_em": dados.get("criado_em") or momento,
    }


def posicao_estoque(codigo: str, prateleira: int = 0, emprestado: int = 0) -> dict:
    return {
        "codigo": compactar_codigo(codigo),
        "prateleira": int(prateleira),
        "emprestado": int(emprestado),
        "atualizado_em": agora(),
    }


def item_visto(produto: dict, estoque: dict | None) -> dict:
    posicao = estoque or {}
    return {
        **produto,
        "prateleira": int(posicao.get("prateleira", 0)),
        "emprestado": int(posicao.get("emprestado", 0)),
        "atualizado_em": posicao.get("atualizado_em") or produto.get("criado_em"),
    }
