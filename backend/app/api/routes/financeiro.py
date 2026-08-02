"""
Rotas de financeiro: receitas, despesas, honorários e relatórios.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.financeiro import CategoriaMovimento, MovimentoFinanceiro, TipoMovimento
from app.models.user import User
from app.schemas.common import MessageResponse, Paginated
from app.schemas.financeiro import (
    MovimentoCreate,
    MovimentoOut,
    MovimentoUpdate,
    ResumoFinanceiro,
)

router = APIRouter(prefix="/financeiro", tags=["Financeiro"])


async def _get_owned_movimento(movimento_id: int, user: User, db: AsyncSession) -> MovimentoFinanceiro:
    """Recupera um movimento garantindo que pertença ao usuário."""
    result = await db.execute(
        select(MovimentoFinanceiro).where(
            MovimentoFinanceiro.id == movimento_id, MovimentoFinanceiro.user_id == user.id
        )
    )
    movimento = result.scalar_one_or_none()
    if movimento is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movimento não encontrado.")
    return movimento


@router.get("", response_model=Paginated[MovimentoOut])
async def list_movimentos(
    tipo: Optional[TipoMovimento] = Query(default=None),
    categoria: Optional[CategoriaMovimento] = Query(default=None),
    inicio: date | None = Query(default=None),
    fim: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Paginated[MovimentoOut]:
    """Lista movimentos financeiros com filtros."""
    filters = [MovimentoFinanceiro.user_id == user.id]
    if tipo:
        filters.append(MovimentoFinanceiro.tipo == tipo)
    if categoria:
        filters.append(MovimentoFinanceiro.categoria == categoria)
    if inicio:
        filters.append(MovimentoFinanceiro.data >= inicio)
    if fim:
        filters.append(MovimentoFinanceiro.data <= fim)

    total = await db.scalar(select(func.count()).select_from(MovimentoFinanceiro).where(*filters)) or 0
    result = await db.execute(
        select(MovimentoFinanceiro).where(*filters).order_by(MovimentoFinanceiro.data.desc(), MovimentoFinanceiro.id.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    items = result.scalars().all()
    return Paginated(
        items=[MovimentoOut.model_validate(m) for m in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max((total + page_size - 1) // page_size, 1) if total else 0,
    )


@router.get("/resumo", response_model=ResumoFinanceiro)
async def resumo_financeiro(
    inicio: date | None = Query(default=None),
    fim: date | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResumoFinanceiro:
    """Retorna o resumo consolidado (receitas, despesas, saldo)."""
    filters = [MovimentoFinanceiro.user_id == user.id]
    if inicio:
        filters.append(MovimentoFinanceiro.data >= inicio)
    if fim:
        filters.append(MovimentoFinanceiro.data <= fim)

    def _sum(tipo: TipoMovimento, status_filtro: Optional[str] = None) -> float:
        cond = [MovimentoFinanceiro.tipo == tipo, *filters]
        if status_filtro:
            cond.append(MovimentoFinanceiro.status == status_filtro)
        return db.scalar(select(func.coalesce(func.sum(MovimentoFinanceiro.valor), 0.0)).where(*cond))

    receitas = await _sum(TipoMovimento.RECEITA)
    despesas = await _sum(TipoMovimento.DESPESA)
    receitas_pendentes = await _sum(TipoMovimento.RECEITA, "pendente")
    despesas_pendentes = await _sum(TipoMovimento.DESPESA, "pendente")

    return ResumoFinanceiro(
        receitas_total=float(receitas or 0),
        despesas_total=float(despesas or 0),
        saldo=float((receitas or 0) - (despesas or 0)),
        receitas_pendentes=float(receitas_pendentes or 0),
        despesas_pendentes=float(despesas_pendentes or 0),
    )


@router.post("", response_model=MovimentoOut, status_code=status.HTTP_201_CREATED)
async def create_movimento(
    payload: MovimentoCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MovimentoFinanceiro:
    """Registra uma receita ou despesa."""
    movimento = MovimentoFinanceiro(user_id=user.id, **payload.model_dump())
    db.add(movimento)
    await db.commit()
    await db.refresh(movimento)
    return movimento


@router.put("/{movimento_id}", response_model=MovimentoOut)
async def update_movimento(
    movimento_id: int,
    payload: MovimentoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MovimentoFinanceiro:
    """Atualiza um movimento financeiro."""
    movimento = await _get_owned_movimento(movimento_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(movimento, field, value)
    await db.commit()
    await db.refresh(movimento)
    return movimento


@router.delete("/{movimento_id}", response_model=MessageResponse)
async def delete_movimento(
    movimento_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Exclui um movimento financeiro."""
    movimento = await _get_owned_movimento(movimento_id, user, db)
    await db.delete(movimento)
    await db.commit()
    return MessageResponse(message="Movimento excluído com sucesso.")
