from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from backend.api.dependencias import get_repo
from backend.persistencia.repositorio_json import RepositorioJson

router = APIRouter(prefix="/api/fotos", tags=["fotos"])


@router.post("")
async def enviar_foto(
    arquivo: UploadFile = File(...),
    repo: RepositorioJson = Depends(get_repo),
) -> dict:
    conteudo = await arquivo.read()
    if not conteudo:
        raise HTTPException(status_code=400, detail="Foto vazia")
    nome = repo.salvar_foto(conteudo, arquivo.content_type or "image/jpeg")
    return {"url": f"/fotos/{nome}"}
