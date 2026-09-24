import os
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

from backend.dominio.rotulo import sugerir_campos
from backend.persistencia.caminhos import RAIZ

TESSERACT_LOCAL = RAIZ / ".ferramentas" / "tesseract"


def _configurar_tesseract() -> None:
    import pytesseract

    binario = TESSERACT_LOCAL / "usr" / "bin" / "tesseract"
    tessdata = TESSERACT_LOCAL / "usr" / "share" / "tesseract-ocr" / "5" / "tessdata"
    libs = TESSERACT_LOCAL / "usr" / "lib" / "x86_64-linux-gnu"
    if binario.exists():
        pytesseract.pytesseract.tesseract_cmd = str(binario)
        os.environ["TESSDATA_PREFIX"] = str(tessdata)
        atual = os.environ.get("LD_LIBRARY_PATH", "")
        caminho = str(libs)
        if caminho not in atual.split(":"):
            os.environ["LD_LIBRARY_PATH"] = f"{caminho}:{atual}" if atual else caminho


def _preparar(imagem: Image.Image) -> Image.Image:
    convertida = ImageOps.exif_transpose(imagem).convert("L")
    if max(convertida.size) > 1600:
        convertida.thumbnail((1600, 1600))
    contrastada = ImageOps.autocontrast(convertida)
    return contrastada.filter(ImageFilter.SHARPEN)


def ler_rotulo(conteudo: bytes) -> dict:
    import pytesseract

    _configurar_tesseract()
    with Image.open(BytesIO(conteudo)) as original:
        preparada = _preparar(original)
        texto = pytesseract.image_to_string(preparada, lang="por+eng")
    return sugerir_campos(texto)


def ocr_disponivel() -> bool:
    try:
        import pytesseract

        _configurar_tesseract()
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False
