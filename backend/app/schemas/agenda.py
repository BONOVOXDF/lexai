"""Schemas Pydantic para agenda."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.agenda import TipoEvento


class EventoBase(BaseModel):
    """Dados comuns de um evento."""

    titulo: str
    tipo: TipoEvento = TipoEvento.OUTRO
    descricao: Optional[str] = None
    data_inicio: date
    hora_inicio: Optional[str] = None
    data_fim: Optional[date] = None
    hora_fim: Optional[str] = None
    local: Optional[str] = None
    notificar: bool = True
    concluido: bool = False


class EventoCreate(EventoBase):
    """Dados para criar um evento."""

    cliente_id: Optional[int] = None
    processo_id: Optional[int] = None


class EventoUpdate(BaseModel):
    """Dados para atualizar um evento."""

    titulo: Optional[str] = None
    tipo: Optional[TipoEvento] = None
    descricao: Optional[str] = None
    data_inicio: Optional[date] = None
    hora_inicio: Optional[str] = None
    data_fim: Optional[date] = None
    hora_fim: Optional[str] = None
    local: Optional[str] = None
    notificar: Optional[bool] = None
    concluido: Optional[bool] = None
    cliente_id: Optional[int] = None
    processo_id: Optional[int] = None


class EventoOut(EventoBase):
    """Evento retornado pela API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    cliente_id: Optional[int] = None
    processo_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
