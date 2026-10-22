from fastapi import APIRouter, Depends, HTTPException

from backend.api.dependencias import get_repo
from backend.api.esquemas import SolicitacaoCadastro, SolicitacaoNova, SolicitacaoRecebimento
from backend.api.rotas_usuarios import autorizar
from backend.persistencia.repositorio_json import RepositorioJson

router = APIRouter(prefix="/api/solicitacoes", tags=["solicitacoes"])


@router.get("")
def listar(repo: RepositorioJson = Depends(get_repo)) -> dict:
    return {"solicitacoes": repo.listar_solicitacoes()}


@router.get("/notificacoes")
def notificacoes(usuario_id: str, repo: RepositorioJson = Depends(get_repo)) -> dict:
    autorizar(repo, usuario_id, "pedir")
    return {"notificacoes": repo.notificacoes(usuario_id)}


@router.post("")
def criar(dados: SolicitacaoNova, repo: RepositorioJson = Depends(get_repo)) -> dict:
    usuario = autorizar(repo, dados.usuario_id, "pedir")
    return repo.criar_solicitacao(usuario, dados.model_dump())


@router.patch("/{solicitacao_id}/cadastro")
def cadastrar(solicitacao_id: str, dados: SolicitacaoCadastro, repo: RepositorioJson = Depends(get_repo)) -> dict:
    autorizar(repo, dados.usuario_id, "cadastrar")
    solicitacao = repo.cadastrar_solicitacao(solicitacao_id, dados.model_dump())
    if solicitacao is None:
        raise HTTPException(status_code=404, detail="Pedido nao encontrado")
    return solicitacao


@router.post("/{solicitacao_id}/receber")
def receber(solicitacao_id: str, dados: SolicitacaoRecebimento, repo: RepositorioJson = Depends(get_repo)) -> dict:
    usuario = autorizar(repo, dados.usuario_id, "receber")
    try:
        solicitacao = repo.receber_solicitacao(solicitacao_id, usuario, dados.model_dump())
    except ValueError as erro:
        raise HTTPException(status_code=409, detail=str(erro)) from erro
    if solicitacao is None:
        raise HTTPException(status_code=404, detail="Pedido nao encontrado")
    return solicitacao
