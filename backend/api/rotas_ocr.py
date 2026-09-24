from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from backend.api.dependencias import get_repo
from backend.persistencia.repositorio_json import RepositorioJson
from backend.servicos.ocr import ler_rotulo, ocr_disponivel

router = APIRouter(prefix="/api/ocr", tags=["ocr"])


@router.get("/status")
def status() -> dict:
    return {"disponivel": ocr_disponivel()}


@router.post("")
async def ler_foto(
    arquivo: UploadFile = File(...),
    repo: RepositorioJson = Depends(get_repo),
) -> dict:
    if not ocr_disponivel():
        raise HTTPException(
            status_code=503,
            detail="Tesseract nao esta instalado neste computador",
        )
    conteudo = await arquivo.read()
    if not conteudo:
        raise HTTPException(status_code=400, detail="Foto vazia")
    nome = repo.salvar_foto(conteudo, arquivo.content_type or "image/jpeg")
    campos = ler_rotulo(conteudo)
    return {"url": f"/fotos/{nome}", **campos}
