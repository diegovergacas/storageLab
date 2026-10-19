from pydantic import BaseModel, Field


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
