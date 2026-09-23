from pydantic import BaseModel, Field


class ItemNovo(BaseModel):
    codigo: str = Field(min_length=1)
    tipo: str = "desconhecido"
    nome: str = Field(min_length=1)
    marca: str = ""
    foto: str | None = None
