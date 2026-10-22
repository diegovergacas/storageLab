from fastapi import APIRouter, Depends, HTTPException

from backend.api.dependencias import get_repo
from backend.api.esquemas import UsuarioEdicao, UsuarioNovo
from backend.dominio.usuarios import PERFIS, pode
from backend.persistencia.repositorio_json import RepositorioJson

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


def autorizar(repo: RepositorioJson, usuario_id: str, acao: str) -> dict:
    usuario = repo.usuario(usuario_id)
    if usuario is None:
        raise HTTPException(status_code=401, detail="Usuario nao encontrado")
    if not pode(usuario["perfil"], acao):
        raise HTTPException(status_code=403, detail="Seu perfil nao tem permissao para esta acao")
    return usuario


def validar_perfil(perfil: str) -> str:
    perfil = perfil.upper()
    if perfil not in PERFIS:
        raise HTTPException(status_code=422, detail="Perfil invalido")
    return perfil


@router.get("")
def listar(repo: RepositorioJson = Depends(get_repo)) -> dict:
    return {"usuarios": repo.listar_usuarios()}


@router.post("")
def criar(ator_id: str, dados: UsuarioNovo, repo: RepositorioJson = Depends(get_repo)) -> dict:
    ator = autorizar(repo, ator_id, "gerir_usuarios")
    perfil = validar_perfil(dados.perfil)
    if perfil == "DESENVOLVEDOR" and ator["perfil"] != "DESENVOLVEDOR":
        raise HTTPException(status_code=403, detail="Somente desenvolvedor pode criar outro desenvolvedor")
    return repo.criar_usuario(dados.nome, perfil)


@router.patch("/{usuario_id}")
def editar(usuario_id: str, ator_id: str, dados: UsuarioEdicao, repo: RepositorioJson = Depends(get_repo)) -> dict:
    ator = autorizar(repo, ator_id, "gerir_usuarios")
    atual = repo.usuario(usuario_id)
    if atual is None:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    perfil = validar_perfil(dados.perfil)
    if ator["perfil"] != "DESENVOLVEDOR" and (atual["perfil"] == "DESENVOLVEDOR" or perfil == "DESENVOLVEDOR"):
        raise HTTPException(status_code=403, detail="Gerente nao pode alterar perfil de desenvolvedor")
    return repo.editar_usuario(usuario_id, dados.nome, perfil)


@router.delete("/dados/todos")
def apagar_dados(ator_id: str, repo: RepositorioJson = Depends(get_repo)) -> dict:
    autorizar(repo, ator_id, "apagar_dados")
    repo.apagar_dados()
    return {"ok": True}
