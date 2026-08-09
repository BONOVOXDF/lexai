"""Schemas Pydantic para intimações do DJEN."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class IntimacaoBase(BaseModel):
    """Dados comuns de uma intimação."""

    numero_processo: str = Field(..., min_length=4, max_length=50)
    tribunal: Optional[str] = Field(default=None, max_length=120)
    orgao: Optional[str] = Field(default=None, max_length=120)
    tipo: str = Field(default="intimacao", max_length=40)
    data_publicacao: Optional[date] = None
    prazo: Optional[date] = None
    descricao: Optional[str] = None
    link: Optional[str] = Field(default=None, max_length=500)


class IntimacaoCreate(IntimacaoBase):
    """Dados para criar uma intimação."""

    processo_id: Optional[int] = None
    cliente_id: Optional[int] = None
    atualizar_prazo_processo: bool = True


class IntimacaoUpdate(BaseModel):
    """Dados para atualizar uma intimação."""

    numero_processo: Optional[str] = Field(default=None, min_length=4, max_length=50)
    tribunal: Optional[str] = Field(default=None, max_length=120)
    orgao: Optional[str] = Field(default=None, max_length=120)
    tipo: Optional[str] = Field(default=None, max_length=40)
    data_publicacao: Optional[date] = None
    prazo: Optional[date] = None
    descricao: Optional[str] = None
    link: Optional[str] = Field(default=None, max_length=500)
    processo_id: Optional[int] = None
    cliente_id: Optional[int] = None
    atualizar_prazo_processo: bool = True


class IntimacaoOut(IntimacaoBase):
    """Intimação retornada pela API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    processo_id: Optional[int] = None
    cliente_id: Optional[int] = None
    cliente_nome: Optional[str] = None
    created_at: datetime
