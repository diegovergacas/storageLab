"""Categorias de produtos pedidos ao laboratório."""

CATEGORIAS = {
    "REAGENTE_QUIMICA",
    "CELULAS",
    "ESCRITORIO",
    "INFORMATICA",
    "KITS_BIOLOGIA_MOLECULAR",
    "CONSUMIVEIS_LABORATORIO",
    "EQUIPAMENTOS",
    "BIOSSEGURANCA_EPI",
    "OUTROS",
}

LEGADAS = {"REAGENTES": "REAGENTE_QUIMICA"}


def normalizar_categoria(valor: str | None) -> str:
    codigo = str(valor or "OUTROS").strip().upper()
    return LEGADAS.get(codigo, codigo)


def validar_categoria(valor: str) -> str:
    codigo = normalizar_categoria(valor)
    if codigo not in CATEGORIAS:
        raise ValueError("Categoria de produto inválida")
    return codigo
