from backend.persistencia.caminhos import (
    CATALOGO_JSON,
    ESTOQUE_JSON,
    FOTOS,
    PEDIDOS_JSON,
    SOLICITACOES_JSON,
    USUARIOS_JSON,
)
from backend.persistencia.repositorio_json import RepositorioJson

_repo: RepositorioJson | None = None


def get_repo() -> RepositorioJson:
    global _repo
    if _repo is None:
        _repo = RepositorioJson(
            CATALOGO_JSON,
            ESTOQUE_JSON,
            FOTOS,
            PEDIDOS_JSON,
            USUARIOS_JSON,
            SOLICITACOES_JSON,
        )
    return _repo
