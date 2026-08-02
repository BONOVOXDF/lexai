"""Schemas Pydantic do módulo de dashboard."""

from datetime import date
from typing import List, Optional

from pydantic import BaseModel

from app.schemas.agenda import EventoOut
from app.schemas.cliente import ClienteOut
from app.schemas.conversa import ConversaOut
from app.schemas.peticao import PeticaoOut
from app.schemas.processo import ProcessoOut


class DashboardStats(BaseModel):
    """Indicadores numéricos do dashboard."""

    total_clientes: int
    total_processos: int
    processos_andamento: int
    processos_prazo_proximo: int
    total_consultas_ia: int
    total_peticoes: int
    total_documentos: int
    eventos_hoje: int
    receitas_mes: float
    despesas_mes: float


class PontoGrafico(BaseModel):
    """Ponto para gráficos temporais."""

    rotulo: str
    valor: float


class AtividadeRecente(BaseModel):
    """Atividade recente exibida no dashboard."""

    id: int
    tipo: str
    descricao: str
    data: str
    entidade_id: Optional[int] = None


class DashboardData(BaseModel):
    """Payload completo do dashboard."""

    stats: DashboardStats
    peticoes_recentes: List[PeticaoOut] = []
    processos_recentes: List[ProcessoOut] = []
    clientes_recentes: List[ClienteOut] = []
    conversas_recentes: List[ConversaOut] = []
    eventos_proximos: List[EventoOut] = []
    atividades_recentes: List[AtividadeRecente] = []
    receitas_por_mes: List[PontoGrafico] = []
    despesas_por_mes: List[PontoGrafico] = []
