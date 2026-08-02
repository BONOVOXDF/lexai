"""
Rotas de agenda: eventos, audiências, compromissos e prazos.
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.agenda import EventoAgenda
from app.models.user import User
from app.schemas.agenda import EventoCreate, EventoOut, EventoUpdate
from app.schemas.common import MessageResponse, Paginated

router = APIRouter(prefix="/agenda", tags=["Agenda"])


async def _get_owned_evento(evento_id: int, user: User, db: AsyncSession) -> EventoAgenda:
    """Recupera um evento garantindo que pertença ao usuário."""
    result = await db.execute(
        select(EventoAgenda).where(EventoAgenda.id == evento_id, EventoAgenda.user_id == user.id)
    )
    evento = result.scalar_one_or_none()
    if evento is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado.")
    return evento


@router.get("", response_model=Paginated[EventoOut])
async def list_eventos(
    inicio: date | None = Query(default=None, description="Data inicial do filtro"),
    fim: date | None = Query(default=None, description="Data final do filtro"),
    tipo: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Paginated[EventoOut]:
    """Lista eventos da agenda com filtro por período."""
    filters = [EventoAgenda.user_id == user.id]
    if inicio:
        filters.append(EventoAgenda.data_inicio >= inicio)
    if fim:
        filters.append(EventoAgenda.data_inicio <= fim)
    if tipo:
        filters.append(EventoAgenda.tipo == tipo)

    total = await db.scalar(select(func.count()).select_from(EventoAgenda).where(*filters)) or 0
    result = await db.execute(
        select(EventoAgenda).where(*filters).order_by(EventoAgenda.data_inicio.asc(), EventoAgenda.hora_inicio.asc()).offset((page - 1) * page_size).limit(page_size)
    )
    items = result.scalars().all()
    return Paginated(
        items=[EventoOut.model_validate(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max((total + page_size - 1) // page_size, 1) if total else 0,
    )


@router.get("/{evento_id}", response_model=EventoOut)
async def get_evento(
    evento_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EventoAgenda:
    """Retorna um evento específico do usuário."""
    return await _get_owned_evento(evento_id, user, db)


@router.post("", response_model=EventoOut, status_code=status.HTTP_201_CREATED)
async def create_evento(
    payload: EventoCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EventoAgenda:
    """Cria um novo evento na agenda."""
    evento = EventoAgenda(user_id=user.id, **payload.model_dump())
    db.add(evento)
    await db.commit()
    await db.refresh(evento)
    return evento


@router.put("/{evento_id}", response_model=EventoOut)
async def update_evento(
    evento_id: int,
    payload: EventoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EventoAgenda:
    """Atualiza um evento (ex.: concluir, remarcar)."""
    evento = await _get_owned_evento(evento_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(evento, field, value)
    await db.commit()
    await db.refresh(evento)
    return evento


@router.delete("/{evento_id}", response_model=MessageResponse)
async def delete_evento(
    evento_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Exclui um evento da agenda."""
    evento = await _get_owned_evento(evento_id, user, db)
    await db.delete(evento)
    await db.commit()
    return MessageResponse(message="Evento excluído com sucesso.")
