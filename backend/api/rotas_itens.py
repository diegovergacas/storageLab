from fastapi import APIRouter, Depends, HTTPException

from backend.api.dependencias import get_repo
from backend.api.esquemas import ItemNovo
from backend.persistencia.repositorio_json import RepositorioJson

router = APIRouter(prefix="/api/itens", tags=["itens"])


@router.get("")
def listar(repo: RepositorioJson = Depends(get_repo)) -> dict:
    return {"itens": repo.listar()}


@router.get("/{codigo}")
def buscar(codigo: str, repo: RepositorioJson = Depends(get_repo)) -> dict:
    item = repo.buscar(codigo)
    if item is None:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    return item


@router.post("/{codigo}/entrada")
def entrada(codigo: str, repo: RepositorioJson = Depends(get_repo)) -> dict:
    item = repo.entrada(codigo)
    if item is None:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    return item


@router.post("")
def cadastrar(item: ItemNovo, repo: RepositorioJson = Depends(get_repo)) -> dict:
    return repo.cadastrar(item.model_dump())
