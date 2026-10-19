import hashlib
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timedelta
from pathlib import Path

from backend.dominio.item import CAMPOS_BASE, valores_moeda

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
PLANILHA = Path(__file__).resolve().parents[2] / "LISTA INSUMOS LAB PESQ.xlsx"


def codigo_planilha(nome: str, empresa: str) -> str:
    chave = f"{_normalizar(nome)}|{_normalizar(empresa)}"
    return "PLAN-" + hashlib.sha1(chave.encode("utf-8")).hexdigest()[:10].upper()


def _normalizar(texto: str) -> str:
    return " ".join((texto or "").lower().split())


def _textos_compartilhados(raiz: ET.Element) -> list[str]:
    textos = []
    for si in raiz.findall("m:si", NS):
        partes = [t.text or "" for t in si.findall(".//m:t", NS)]
        textos.append("".join(partes))
    return textos


def _coluna_linha(ref: str) -> tuple[int, int]:
    letras = "".join(c for c in ref if c.isalpha())
    linha = int("".join(c for c in ref if c.isdigit()))
    coluna = 0
    for letra in letras:
        coluna = coluna * 26 + (ord(letra) - 64)
    return coluna, linha


def _grade(sheet_xml: bytes, textos: list[str]) -> dict[tuple[int, int], str]:
    raiz = ET.fromstring(sheet_xml)
    grade: dict[tuple[int, int], str] = {}
    for celula in raiz.findall(".//m:c", NS):
        ref = celula.attrib.get("r")
        if not ref:
            continue
        coluna, linha = _coluna_linha(ref)
        valor = celula.find("m:v", NS)
        bruto = valor.text if valor is not None else ""
        if celula.attrib.get("t") == "s" and bruto.isdigit():
            bruto = textos[int(bruto)]
        grade[(linha, coluna)] = bruto
    return grade


def _data_excel(valor: str) -> str:
    if not valor:
        return ""
    try:
        serial = float(valor)
        if serial > 20000:
            return (datetime(1899, 12, 30) + timedelta(days=serial)).date().isoformat()
    except ValueError:
        return valor.strip()
    return valor.strip()


def _colunas_por_cabecalho(grade: dict[tuple[int, int], str]) -> dict[str, int]:
    return {
        _normalizar(valor): coluna
        for (linha, coluna), valor in grade.items()
        if linha == 1 and _normalizar(valor)
    }


def _valor(grade: dict[tuple[int, int], str], linha: int, colunas: dict[str, int], *nomes: str) -> str:
    for nome in nomes:
        coluna = colunas.get(_normalizar(nome))
        if coluna:
            return str(grade.get((linha, coluna)) or "").strip()
    return ""


def ler_compras(caminho: Path | None = None) -> dict:
    arquivo = caminho or PLANILHA
    with zipfile.ZipFile(arquivo) as zipado:
        textos = _textos_compartilhados(ET.fromstring(zipado.read("xl/sharedStrings.xml")))
        grade = _grade(zipado.read("xl/worksheets/sheet1.xml"), textos)

    colunas = _colunas_por_cabecalho(grade)

    pedidos = []
    vistos: dict[str, dict] = {}
    for linha in range(2, 2000):
        nome = _valor(grade, linha, colunas, "Reagente/Material")
        if not nome:
            continue
        empresa = _valor(grade, linha, colunas, "Empresa")
        interno = codigo_planilha(nome, empresa)
        valor = _valor(grade, linha, colunas, "Valor")
        pedido = {
            "codigo_produto": interno,
            "solicitante": _valor(grade, linha, colunas, "Solicitante"),
            "nome": nome,
            "codigo_fornecedor": _valor(grade, linha, colunas, "Código", "Codigo"),
            "quantidade": _valor(grade, linha, colunas, "Quantidade"),
            "unidade": _valor(grade, linha, colunas, "Unidade"),
            "empresa": empresa,
            "data": _data_excel(_valor(grade, linha, colunas, "Data")),
            "valor": valor,
            **valores_moeda(valor),
            "previsao": _data_excel(_valor(grade, linha, colunas, "Previsão", "Previsao")),
            "verba": _valor(grade, linha, colunas, "Verba"),
            "entregue": _valor(grade, linha, colunas, "Entregue"),
            "data_entrega": _data_excel(_valor(grade, linha, colunas, "Data da entrega")),
            "local_sala": _valor(grade, linha, colunas, "Local Sala"),
            "local_armazenamento": _valor(
                grade,
                linha,
                colunas,
                "Local armário/Freezer/Geladeira",
                "Local armario/Freezer/Geladeira",
            ),
        }
        pedidos.append(pedido)
        if interno not in vistos:
            vistos[interno] = {
                "codigo": interno,
                "tipo": "planilha",
                "nome": nome,
                "marca": empresa,
                "foto": None,
                "origem": "planilha",
                "pendente_codigo": True,
                **{campo: pedido[campo] for campo in CAMPOS_BASE},
            }
        else:
            vistos[interno]["quantidade"] = _somar_quantidade(
                vistos[interno]["quantidade"],
                pedido["quantidade"],
            )
            if pedido["data"] >= vistos[interno].get("data", ""):
                for campo in CAMPOS_BASE:
                    if pedido[campo]:
                        vistos[interno][campo] = pedido[campo]
    return {"produtos": list(vistos.values()), "pedidos": pedidos}


def _somar_quantidade(atual: str, novo: str) -> str:
    try:
        return str(float(atual or 0) + float(novo or 0))
    except ValueError:
        return novo or atual
