"""Schemas Pydantic para atas (registro de audiências e reuniões)."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.ata import TipoAta


class AtaBase(BaseModel):
    """Dados comuns de uma ata."""

    titulo: str
    tipo: TipoAta = TipoAta.REUNIAO
    data_evento: Optional[date] = None
    local: Optional[str] = None
    participantes: Optional[str] = None
    processo_id: Optional[int] = None
    processo_numero: Optional[str] = None
    conteudo: str = ""
    observacoes: Optional[str] = None


class AtaCreate(AtaBase):
    """Dados para registrar uma ata manualmente."""

    pass


class AtaUpdate(BaseModel):
    """Dados para atualizar uma ata."""

    titulo: Optional[str] = None
    tipo: Optional[TipoAta] = None
    data_evento: Optional[date] = None
    local: Optional[str] = None
    participantes: Optional[str] = None
    processo_id: Optional[int] = None
    processo_numero: Optional[str] = None
    conteudo: Optional[str] = None
    observacoes: Optional[str] = None


class AtaGenerateRequest(BaseModel):
    """Parâmetros para gerar uma ata via IA a partir das notas do advogado."""

    titulo: str
    tipo: TipoAta = TipoAta.REUNIAO
    data_evento: Optional[date] = None
    local: Optional[str] = None
    participantes: Optional[str] = None
    processo_id: Optional[int] = None
    processo_numero: Optional[str] = None
    notas: str = Field(
        ...,
        min_length=10,
        description="Notas brutas da reunião/audiência que serão estruturadas em ata.",
    )


class AtaOut(AtaBase):
    """Ata retornada pela API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
