"""
Rotas de prazos: quadro kanban com processos agrupados por faixa de
vencimento e movimentação dos cards (atualiza o prazo do processo).
"""

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_db
from app.models.processo import Processo, StatusProcesso
from app.models.user import User
from app.schemas.prazo import KanbanPrazosOut, MoverPrazoRequest, PrazoKanbanItem

router = APIRouter(prefix="/prazos", tags=["Prazos"])

COLUNAS = ("atrasados", "hoje", "7_dias", "30_dias", "depois", "sem_prazo")

# Data representativa aplicada ao mover um card para uma coluna.
PRAZO_REPRESENTATIVO: Dict[str, Optional[int]] = {
    "atrasados": -1,
    "hoje": 0,
    "7_dias": 3,
    "30_dias": 15,
    "depois": 45,
    "sem_prazo": None,
}

TITULO_COLUNAS = {
    "atrasados": "Atrasados",
    "hoje": "Vencem hoje",
    "7_dias": "Próximos 7 dias",
    "30_dias": "Próximos 30 dias",
    "depois": "Depois",
    "sem_prazo": "Sem prazo",
}


def _hoje_br() -> date:
    return datetime.now(ZoneInfo("America/Sao_Paulo")).date()


def _item(processo: Processo) -> PrazoKanbanItem:
    return PrazoKanbanItem(
        id=processo.id,
        numero=processo.numero,
        tribunal=processo.tribunal,
        classe=processo.classe,
        comarca=processo.comarca,
        status=processo.status,
        prazo=processo.prazo,
        cliente_id=processo.cliente_id,
        cliente_nome=processo.cliente.nome if processo.cliente else None,
    )


def _classificar(prazo: Optional[date], hoje: date) -> str:
    if prazo is None:
        return "sem_prazo"
    if prazo < hoje:
        return "atrasados"
    if prazo == hoje:
        return "hoje"
    if prazo <= hoje + timedelta(days=7):
        return "7_dias"
    if prazo <= hoje + timedelta(days=30):
        return "30_dias"
    return "depois"


@router.get("/kanban", response_model=KanbanPrazosOut)
async def kanban_prazos(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KanbanPrazosOut:
    """Retorna os processos do usuário agrupados por faixa de vencimento."""
    hoje = _hoje_br()
    result = await db.execute(
        select(Processo)
        .options(selectinload(Processo.cliente))
        .where(Processo.user_id == user.id)
        .order_by(Processo.prazo.asc().nulls_last())
    )
    processos = result.scalars().all()

    colunas: Dict[str, List[PrazoKanbanItem]] = {col: [] for col in COLUNAS}
    for processo in processos:
        chave = _classificar(processo.prazo, hoje)
        colunas[chave].append(_item(processo))

    return KanbanPrazosOut(colunas=colunas)


@router.put("/{processo_id}/mover")
async def mover_prazo(
    processo_id: int,
    payload: MoverPrazoRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Move um card no kanban, ajustando o prazo do processo."""
    if payload.coluna not in PRAZO_REPRESENTATIVO:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Coluna inválida.")

    result = await db.execute(
        select(Processo).where(Processo.id == processo_id, Processo.user_id == user.id)
    )
    processo = result.scalar_one_or_none()
    if processo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Processo não encontrado.")

    offset = PRAZO_REPRESENTATIVO[payload.coluna]
    processo.prazo = None if offset is None else _hoje_br() + timedelta(days=offset)
    await db.commit()

    return {"ok": True, "prazo": processo.prazo.isoformat() if processo.prazo else None}
