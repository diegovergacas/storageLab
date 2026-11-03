from pydantic import BaseModel, Field, field_validator

from backend.dominio.categorias import validar_categoria


class UsuarioNovo(BaseModel):
    nome: str = Field(min_length=1)
    perfil: str


class UsuarioEdicao(BaseModel):
    nome: str = Field(min_length=1)
    perfil: str


class SolicitacaoItemNovo(BaseModel):
    nome: str = Field(min_length=1)
    quantidade: int = Field(ge=1)
    unidade: str = Field(min_length=1)
    categoria_compra: str = Field(min_length=1)

    @field_validator("categoria_compra")
    @classmethod
    def categoria_valida(cls, valor: str) -> str:
        return validar_categoria(valor)


class SolicitacaoNova(BaseModel):
    usuario_id: str = Field(min_length=1)
    itens: list[SolicitacaoItemNovo] = Field(min_length=1)
    observacao: str = ""
    previsao: str = ""
    verba: str = ""


class SolicitacaoCadastro(BaseModel):
    usuario_id: str = Field(min_length=1)
    item_id: str = Field(min_length=1)
    marca: str = ""
    codigo_fornecedor: str = ""
    local_sala: str = ""
    local_armazenamento: str = ""
    data_compra: str = ""
    valor: str = ""


class SolicitacaoAtribuicao(BaseModel):
    usuario_id: str = Field(min_length=1)
    item_id: str = Field(min_length=1)


class SolicitacaoRecebimento(BaseModel):
    usuario_id: str = Field(min_length=1)
    item_id: str = Field(min_length=1)
    quantidade_recebida: int = Field(default=1, ge=1)
    codigo: str = ""
    data_entrega: str = ""
    observacao: str = ""


class ItemNovo(BaseModel):
    codigo: str = Field(min_length=1)
    tipo: str = "desconhecido"
    nome: str = Field(min_length=1)
    marca: str = ""
    empresa: str = ""
    solicitante: str = ""
    codigo_fornecedor: str = ""
    quantidade: str = ""
    unidade: str = ""
    data: str = ""
    valor: str = ""
    valor_brl: str = ""
    valor_usd: str = ""
    previsao: str = ""
    verba: str = ""
    entregue: str = ""
    data_entrega: str = ""
    local_sala: str = ""
    local_armazenamento: str = ""
    foto: str | None = None


class ItemEdicao(BaseModel):
    nome: str = Field(min_length=1)
    marca: str = ""
    empresa: str = ""
    solicitante: str = ""
    codigo_fornecedor: str = ""
    quantidade: str = ""
    unidade: str = ""
    data: str = ""
    valor: str = ""
    valor_brl: str = ""
    valor_usd: str = ""
    previsao: str = ""
    verba: str = ""
    entregue: str = ""
    data_entrega: str = ""
    local_sala: str = ""
    local_armazenamento: str = ""


class QuantidadeMovimento(BaseModel):
    quantidade: int = Field(default=1, ge=1)


class VincularCodigo(BaseModel):
    codigo_interno: str = Field(min_length=1)
    codigo: str = Field(min_length=1)
    tipo: str = "codigo"
    entrada: bool = True
