PERFIS = ("DESENVOLVEDOR", "GERENTE", "TECNICO", "ALUNO")

PERMISSOES = {
    "DESENVOLVEDOR": {"pedir", "cadastrar", "receber", "gerir_usuarios", "apagar_dados"},
    "GERENTE": {"pedir", "cadastrar", "receber", "gerir_usuarios"},
    "TECNICO": {"pedir", "cadastrar", "receber"},
    "ALUNO": {"pedir", "receber"},
}


def pode(perfil: str, acao: str) -> bool:
    return acao in PERMISSOES.get(perfil.upper(), set())
