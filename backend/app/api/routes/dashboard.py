"""
Rotas do dashboard: indicadores, gráficos e atividades recentes.
"""

import logging
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_db
from app.models.agenda import EventoAgenda
from app.models.cliente import Cliente
from app.models.conversa import Conversa, Mensagem
from app.models.documento import Documento
from app.models.financeiro import MovimentoFinanceiro, TipoMovimento
from app.models.peticao import Peticao
from app.models.processo import Processo, StatusProcesso
from app.models.user import User
from app.schemas.dashboard import (
    AtividadeRecente,
    DashboardData,
    DashboardStats,
    PontoGrafico,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardData)
async def get_dashboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardData:
    """Retorna todos os dados consolidados para o dashboard do usuário."""
    hoje = date.today()
    primeiro_dia_mes = hoje.replace(day=1)
    proximo_dia = hoje + timedelta(days=1)

    # --- Indicadores ---
    total_clientes = await db.scalar(select(func.count()).select_from(Cliente).where(Cliente.user_id == user.id)) or 0
    total_processos = await db.scalar(select(func.count()).select_from(Processo).where(Processo.user_id == user.id)) or 0
    processos_andamento = (
        await db.scalar(
            select(func.count()).select_from(Processo).where(
                Processo.user_id == user.id, Processo.status == StatusProcesso.EM_ANDAMENTO
            )
        )
        or 0
    )
    processos_prazo_proximo = (
        await db.scalar(
            select(func.count()).select_from(Processo).where(
                Processo.user_id == user.id, Processo.prazo.isnot(None), Processo.prazo <= proximo_dia + timedelta(days=15)
            )
        )
        or 0
    )
    total_consultas_ia = (
        await db.scalar(
            select(func.count()).select_from(Mensagem).join(Conversa).where(Conversa.user_id == user.id, Mensagem.tipo == "usuario")
        )
        or 0
    )
    total_peticoes = await db.scalar(select(func.count()).select_from(Peticao).where(Peticao.user_id == user.id)) or 0
    total_documentos = await db.scalar(select(func.count()).select_from(Documento).where(Documento.user_id == user.id)) or 0
    eventos_hoje = (
        await db.scalar(
            select(func.count()).select_from(EventoAgenda).where(EventoAgenda.user_id == user.id, EventoAgenda.data_inicio == hoje)
        )
        or 0
    )

    receitas_mes = (
        await db.scalar(
            select(func.coalesce(func.sum(MovimentoFinanceiro.valor), 0.0)).where(
                MovimentoFinanceiro.user_id == user.id,
                MovimentoFinanceiro.tipo == TipoMovimento.RECEITA,
                MovimentoFinanceiro.data >= primeiro_dia_mes,
            )
        )
        or 0.0
    )
    despesas_mes = (
        await db.scalar(
            select(func.coalesce(func.sum(MovimentoFinanceiro.valor), 0.0)).where(
                MovimentoFinanceiro.user_id == user.id,
                MovimentoFinanceiro.tipo == TipoMovimento.DESPESA,
                MovimentoFinanceiro.data >= primeiro_dia_mes,
            )
        )
        or 0.0
    )

    stats = DashboardStats(
        total_clientes=total_clientes,
        total_processos=total_processos,
        processos_andamento=processos_andamento,
        processos_prazo_proximo=processos_prazo_proximo,
        total_consultas_ia=total_consultas_ia,
        total_peticoes=total_peticoes,
        total_documentos=total_documentos,
        eventos_hoje=eventos_hoje,
        receitas_mes=float(receitas_mes),
        despesas_mes=float(despesas_mes),
    )

    # --- Listas recentes ---
    peticoes_recentes = (
        await db.execute(select(Peticao).where(Peticao.user_id == user.id).order_by(Peticao.updated_at.desc()).limit(5))
    ).scalars().all()
    processos_recentes = (
        await db.execute(
            select(Processo).options(selectinload(Processo.cliente)).where(Processo.user_id == user.id).order_by(Processo.updated_at.desc()).limit(5)
        )
    ).scalars().all()
    clientes_recentes = (
        await db.execute(select(Cliente).where(Cliente.user_id == user.id).order_by(Cliente.created_at.desc()).limit(5))
    ).scalars().all()
    conversas_recentes = (
        await db.execute(select(Conversa).where(Conversa.user_id == user.id).order_by(Conversa.updated_at.desc()).limit(5))
    ).scalars().all()
    eventos_proximos = (
        await db.execute(
            select(EventoAgenda).where(EventoAgenda.user_id == user.id, EventoAgenda.data_inicio >= hoje).order_by(EventoAgenda.data_inicio.asc()).limit(6)
        )
    ).scalars().all()

    # --- Atividades recentes (consolidadas por tipo) ---
    atividades: list = []
    for p in peticoes_recentes[:3]:
        atividades.append(
            AtividadeRecente(id=p.id, tipo="peticao", descricao=f"Petição atualizada: {p.titulo}", data=p.updated_at.isoformat(), entidade_id=p.id)
        )
    for pr in processos_recentes[:3]:
        atividades.append(
            AtividadeRecente(id=pr.id, tipo="processo", descricao=f"Processo {pr.numero} atualizado", data=pr.updated_at.isoformat(), entidade_id=pr.id)
        )
    for c in clientes_recentes[:3]:
        atividades.append(
            AtividadeRecente(id=c.id, tipo="cliente", descricao=f"Cliente cadastrado: {c.nome}", data=c.created_at.isoformat(), entidade_id=c.id)
        )

    # --- Gráficos: receitas e despesas dos últimos 6 meses ---
    receitas_por_mes, despesas_por_mes = await _grafico_por_mes(db, user.id)

    return DashboardData(
        stats=stats,
        peticoes_recentes=peticoes_recentes,
        processos_recentes=processos_recentes,
        clientes_recentes=clientes_recentes,
        conversas_recentes=conversas_recentes,
        eventos_proximos=eventos_proximos,
        atividades_recentes=atividades,
        receitas_por_mes=receitas_por_mes,
        despesas_por_mes=despesas_por_mes,
    )


async def _grafico_por_mes(db: AsyncSession, user_id: int) -> tuple[list[PontoGrafico], list[PontoGrafico]]:
    """Agrega receitas/despesas dos últimos 6 meses para o gráfico."""
    hoje = date.today()
    seis_meses_atras = (hoje - timedelta(days=180)).replace(day=1)

    # strftime é específico do SQLite; no PostgreSQL usa-se to_char.
    if db.get_bind().dialect.name == "sqlite":
        chave_mes = func.strftime("%Y-%m", MovimentoFinanceiro.data)
    else:
        chave_mes = func.to_char(MovimentoFinanceiro.data, "YYYY-MM")

    receitas = await db.execute(
        select(chave_mes, func.sum(MovimentoFinanceiro.valor))
        .where(
            MovimentoFinanceiro.user_id == user_id,
            MovimentoFinanceiro.tipo == TipoMovimento.RECEITA,
            MovimentoFinanceiro.data >= seis_meses_atras,
        )
        .group_by(chave_mes)
    )
    despesas = await db.execute(
        select(chave_mes, func.sum(MovimentoFinanceiro.valor))
        .where(
            MovimentoFinanceiro.user_id == user_id,
            MovimentoFinanceiro.tipo == TipoMovimento.DESPESA,
            MovimentoFinanceiro.data >= seis_meses_atras,
        )
        .group_by(chave_mes)
    )

    receitas_map = {str(linha[0]): float(linha[1]) for linha in receitas.all()}
    despesas_map = {str(linha[0]): float(linha[1]) for linha in despesas.all()}

    receitas_lista, despesas_lista = [], []
    ano_mes_atual = hoje
    for i in range(5, -1, -1):
        ref = ano_mes_atual - timedelta(days=30 * i)
        chave = ref.strftime("%Y-%m")
        rotulo = ref.strftime("%b/%y")
        receitas_lista.append(PontoGrafico(rotulo=rotulo, valor=receitas_map.get(chave, 0)))
        despesas_lista.append(PontoGrafico(rotulo=rotulo, valor=despesas_map.get(chave, 0)))

    return receitas_lista, despesas_lista
