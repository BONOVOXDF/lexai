"""Schemas Pydantic para financeiro."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.financeiro import CategoriaMovimento, TipoMovimento


class MovimentoBase(BaseModel):
    """Dados comuns de um movimento financeiro."""

    tipo: TipoMovimento
    categoria: CategoriaMovimento = CategoriaMovimento.OUTROS
    descricao: str = Field(..., min_length=3, max_length=500)
    valor: float = Field(..., gt=0)
    data: date
    status: str = "pago"
    observacoes: Optional[str] = None


class MovimentoCreate(MovimentoBase):
    """Dados para criar um movimento."""

    cliente_id: Optional[int] = None


class MovimentoUpdate(BaseModel):
    """Dados para atualizar um movimento."""

    tipo: Optional[TipoMovimento] = None
    categoria: Optional[CategoriaMovimento] = None
    descricao: Optional[str] = None
    valor: Optional[float] = None
    data: Optional[date] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None
    cliente_id: Optional[int] = None


class MovimentoOut(MovimentoBase):
    """Movimento retornado pela API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    cliente_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class ResumoFinanceiro(BaseModel):
    """Resumo consolidado para o dashboard financeiro."""

    receitas_total: float
    despesas_total: float
    saldo: float
    receitas_pendentes: float
    despesas_pendentes: float
