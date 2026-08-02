"""Schemas Pydantic para processos."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.processo import StatusProcesso


class ProcessoBase(BaseModel):
    """Dados comuns de um processo."""

    numero: str = Field(..., min_length=4, max_length=50)
    tribunal: Optional[str] = Field(default=None, max_length=120)
    classe: Optional[str] = Field(default=None, max_length=120)
    vara: Optional[str] = Field(default=None, max_length=120)
    comarca: Optional[str] = Field(default=None, max_length=120)
    advogado: Optional[str] = Field(default=None, max_length=255)
    status: StatusProcesso = StatusProcesso.EM_ANDAMENTO
    prazo: Optional[date] = None
    observacoes: Optional[str] = None
    valor_causa: Optional[float] = None


class ProcessoCreate(ProcessoBase):
    """Dados para criar um processo."""

    cliente_id: Optional[int] = None


class ProcessoUpdate(BaseModel):
    """Dados para atualizar um processo."""

    cliente_id: Optional[int] = None
    numero: Optional[str] = Field(default=None, min_length=4, max_length=50)
    tribunal: Optional[str] = Field(default=None, max_length=120)
    classe: Optional[str] = Field(default=None, max_length=120)
    vara: Optional[str] = Field(default=None, max_length=120)
    comarca: Optional[str] = Field(default=None, max_length=120)
    advogado: Optional[str] = Field(default=None, max_length=255)
    status: Optional[StatusProcesso] = None
    prazo: Optional[date] = None
    observacoes: Optional[str] = None
    valor_causa: Optional[float] = None


class ProcessoOut(ProcessoBase):
    """Processo retornado pela API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    cliente_id: Optional[int] = None
    cliente_nome: Optional[str] = None
    created_at: datetime
    updated_at: datetime
