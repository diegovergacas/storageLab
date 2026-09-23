import re
from datetime import datetime, timezone


def agora() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def codigo_chave(codigo: str) -> str:
    return re.sub(r"\s+", "", codigo).strip()


def item_novo(dados: dict) -> dict:
    momento = agora()
    return {
        "codigo": codigo_chave(dados["codigo"]),
        "tipo": (dados.get("tipo") or "desconhecido").strip(),
        "nome": dados["nome"].strip(),
        "marca": (dados.get("marca") or "").strip(),
        "prateleira": 1,
        "emprestado": 0,
        "foto": dados.get("foto"),
        "criado_em": momento,
        "atualizado_em": momento,
    }
