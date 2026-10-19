import re
from datetime import datetime, timezone


def agora() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def codigo_chave(codigo: str) -> str:
    return re.sub(r"\s+", "", codigo).strip()


def compactar_codigo(codigo: str) -> str:
    from backend.dominio.codigo import codigo_chave as normalizar

    return normalizar(codigo)


CAMPOS_BASE = (
    "solicitante",
    "codigo_fornecedor",
    "quantidade",
    "unidade",
    "empresa",
    "data",
    "valor",
    "valor_brl",
    "valor_usd",
    "previsao",
    "verba",
    "entregue",
    "data_entrega",
    "local_sala",
    "local_armazenamento",
)


def produto_catalogo(dados: dict) -> dict:
    momento = agora()
    produto = {
        "codigo": compactar_codigo(dados["codigo"]),
        "tipo": (dados.get("tipo") or "desconhecido").strip(),
        "nome": dados["nome"].strip(),
        "marca": (dados.get("marca") or dados.get("empresa") or "").strip(),
        "foto": dados.get("foto"),
        "origem": (dados.get("origem") or "app").strip(),
        "pendente_codigo": bool(dados.get("pendente_codigo", False)),
        "criado_em": dados.get("criado_em") or momento,
    }
    for campo in CAMPOS_BASE:
        produto[campo] = str(dados.get(campo) or "").strip()
    if not produto["empresa"]:
        produto["empresa"] = produto["marca"]
    return produto


def posicao_estoque(codigo: str, prateleira: int = 0, emprestado: int = 0) -> dict:
    return {
        "codigo": compactar_codigo(codigo),
        "prateleira": int(prateleira),
        "emprestado": int(emprestado),
        "atualizado_em": agora(),
    }


def valores_moeda(valor: str) -> dict[str, str]:
    texto = str(valor or "").strip()
    if texto.upper().startswith(("US$", "U$", "USD")):
        return {"valor_brl": "", "valor_usd": texto}
    return {"valor_brl": texto, "valor_usd": ""}


def item_visto(produto: dict, estoque: dict | None) -> dict:
    posicao = estoque or {}
    valor_original = str(produto.get("valor") or "").strip()
    if valor_original:
        # O texto original é a fonte de verdade para cadastros antigos.
        # Assim, um valor identificado como dólar não pode aparecer em R$.
        separados = valores_moeda(valor_original)
        valor_brl = separados["valor_brl"]
        valor_usd = separados["valor_usd"]
    else:
        valor_brl = produto.get("valor_brl") or ""
        valor_usd = produto.get("valor_usd") or ""
    produto = {
        **produto,
        "valor_brl": valor_brl,
        "valor_usd": valor_usd,
    }
    return {
        **produto,
        "prateleira": int(posicao.get("prateleira", 0)),
        "emprestado": int(posicao.get("emprestado", 0)),
        "atualizado_em": posicao.get("atualizado_em") or produto.get("criado_em"),
    }
