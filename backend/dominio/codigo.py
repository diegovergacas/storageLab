import re


def compactar(codigo: str) -> str:
    return re.sub(r"\s+", "", codigo).strip()


def _so_digitos(codigo: str) -> str:
    return re.sub(r"\D", "", codigo)


def checksum_gs1(digitos: str) -> bool:
    if not digitos.isdigit() or len(digitos) not in {8, 12, 13, 14}:
        return False
    corpo = [int(n) for n in digitos[:-1]]
    total = 0
    for i, n in enumerate(reversed(corpo)):
        total += n * (3 if i % 2 == 0 else 1)
    return (10 - (total % 10)) % 10 == int(digitos[-1])


def codigo_chave(codigo: str) -> str:
    bruto = compactar(codigo)
    if "://" in bruto:
        return bruto
    digitos = _so_digitos(bruto)
    if len(digitos) == 12 and checksum_gs1(digitos):
        return f"0{digitos}"
    if len(digitos) in {8, 13, 14} and checksum_gs1(digitos):
        return digitos
    return bruto


def variantes(codigo: str) -> set[str]:
    chave = codigo_chave(codigo)
    valores = {chave, compactar(codigo)}
    digitos = _so_digitos(chave)
    if digitos:
        valores.add(digitos)
        valores.add(digitos.lstrip("0") or "0")
        if len(digitos) == 12:
            valores.add(f"0{digitos}")
        if len(digitos) == 13 and digitos.startswith("0"):
            valores.add(digitos[1:])
    return {v for v in valores if v}
