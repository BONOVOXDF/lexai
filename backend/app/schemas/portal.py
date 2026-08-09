"""Schemas Pydantic do portal do cliente."""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel

from app.models.processo import StatusProcesso


class PortalLoginRequest(BaseModel):
    """Login do cliente no portal."""

    email: str
    senha: str


class PortalAceitarConviteRequest(BaseModel):
    """Criação da senha a partir do token de convite."""

    token: str
    senha: str
    confirmar_senha: str


class PortalLoginOut(BaseModel):
    """Resposta do login no portal."""

    access_token: str
    cliente: dict


class PortalProcessoOut(BaseModel):
    """Processo visível para o cliente no portal."""

    id: int
    numero: str
    tribunal: Optional[str] = None
    classe: Optional[str] = None
    vara: Optional[str] = None
    comarca: Optional[str] = None
    status: StatusProcesso
    prazo: Optional[date] = None
    observacoes: Optional[str] = None
    created_at: datetime


class PortalEventoOut(BaseModel):
    """Evento/audiência visível para o cliente no portal."""

    id: int
    titulo: str
    tipo: str
    descricao: Optional[str] = None
    data_inicio: date
    hora_inicio: Optional[str] = None
    data_fim: Optional[date] = None
    hora_fim: Optional[str] = None
    local: Optional[str] = None
    concluido: bool
    processo_id: Optional[int] = None


class PortalDashboardOut(BaseModel):
    """Visão geral do cliente no portal."""

    cliente: dict
    processos: List[PortalProcessoOut]
    eventos: List[PortalEventoOut]
    total_processos: int
    total_prazos_proximos: int
    proximas_audiencias: List[PortalEventoOut]
