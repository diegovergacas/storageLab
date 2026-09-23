from backend.persistencia.caminhos import ESTOQUE_JSON, FOTOS
from backend.persistencia.repositorio_json import RepositorioJson

_repo: RepositorioJson | None = None


def get_repo() -> RepositorioJson:
    global _repo
    if _repo is None:
        _repo = RepositorioJson(ESTOQUE_JSON, FOTOS)
    return _repo
