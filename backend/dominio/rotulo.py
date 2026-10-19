import re

MARCAS = (
    "merck",
    "sigma",
    "synth",
    "vetec",
    "qhemis",
    "dinâmica",
    "dinamica",
    "neon",
    "exodo",
    "kaidi",
    "pritt",
    "aldrin",
    "anidrol",
    "quimica moderna",
)


def _linhas_uteis(texto: str) -> list[str]:
    linhas = []
    for bruta in texto.splitlines():
        linha = re.sub(r"\s+", " ", bruta).strip()
        if len(linha) < 3:
            continue
        if re.fullmatch(r"[\d\s\-./]+", linha):
            continue
        linhas.append(linha)
    return linhas


def sugerir_campos(texto: str) -> dict:
    linhas = _linhas_uteis(texto)
    marca = ""
    for linha in linhas:
        baixa = linha.lower()
        if any(nome in baixa for nome in MARCAS):
            marca = linha
            break
    return {
        "nome": linhas[0] if linhas else "",
        "marca": marca,
        "texto": texto.strip(),
    }
