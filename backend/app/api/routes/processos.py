"""
Rotas de processos (CRUD), isoladas por usuário autenticado.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_db
from app.models.processo import Processo, StatusProcesso
from app.models.user import User
from app.schemas.common import MessageResponse, Paginated
from app.schemas.processo import ProcessoCreate, ProcessoOut, ProcessoUpdate

router = APIRouter(prefix="/processos", tags=["Processos"])


async def _get_owned_processo(processo_id: int, user: User, db: AsyncSession) -> Processo:
    """Recupera um processo garantindo que pertença ao usuário."""
    result = await db.execute(
        select(Processo)
        .options(selectinload(Processo.cliente))
        .where(Processo.id == processo_id, Processo.user_id == user.id)
    )
    processo = result.scalar_one_or_none()
    if processo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Processo não encontrado.")
    return processo


def _to_out(processo: Processo) -> ProcessoOut:
    """Converte modelo em schema de saída, anexando o nome do cliente."""
    out = ProcessoOut.model_validate(processo)
    out.cliente_nome = processo.cliente.nome if processo.cliente else None
    return out


@router.get("", response_model=Paginated[ProcessoOut])
async def list_processos(
    q: str | None = Query(default=None, description="Busca por número, tribunal ou classe"),
    status_filter: Optional[StatusProcesso] = Query(default=None, alias="status"),
    cliente_id: Optional[int] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Paginated[ProcessoOut]:
    """Lista processos do usuário com filtros e paginação."""
    filters = [Processo.user_id == user.id]
    if q:
        like = f"%{q}%"
        filters.append(
            (Processo.numero.ilike(like)) | (Processo.tribunal.ilike(like)) | (Processo.classe.ilike(like))
        )
    if status_filter:
        filters.append(Processo.status == status_filter)
    if cliente_id:
        filters.append(Processo.cliente_id == cliente_id)

    total = await db.scalar(select(func.count()).select_from(Processo).where(*filters)) or 0
    result = await db.execute(
        select(Processo)
        .options(selectinload(Processo.cliente))
        .where(*filters)
        .order_by(Processo.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = result.scalars().all()

    return Paginated(
        items=[_to_out(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max((total + page_size - 1) // page_size, 1) if total else 0,
    )


@router.get("/{processo_id}", response_model=ProcessoOut)
async def get_processo(
    processo_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProcessoOut:
    """Retorna um processo específico do usuário."""
    return _to_out(await _get_owned_processo(processo_id, user, db))


@router.post("", response_model=ProcessoOut, status_code=status.HTTP_201_CREATED)
async def create_processo(
    payload: ProcessoCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProcessoOut:
    """Cria um novo processo vinculado ao usuário."""
    processo = Processo(user_id=user.id, **payload.model_dump())
    db.add(processo)
    await db.commit()
    await db.refresh(processo)
    return _to_out(await _get_owned_processo(processo.id, user, db))


@router.put("/{processo_id}", response_model=ProcessoOut)
async def update_processo(
    processo_id: int,
    payload: ProcessoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProcessoOut:
    """Atualiza um processo do usuário."""
    processo = await _get_owned_processo(processo_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(processo, field, value)
    await db.commit()
    await db.refresh(processo)
    return _to_out(await _get_owned_processo(processo_id, user, db))


@router.delete("/{processo_id}", response_model=MessageResponse)
async def delete_processo(
    processo_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Exclui um processo do usuário."""
    processo = await _get_owned_processo(processo_id, user, db)
    await db.delete(processo)
    await db.commit()
    return MessageResponse(message="Processo excluído com sucesso.")
