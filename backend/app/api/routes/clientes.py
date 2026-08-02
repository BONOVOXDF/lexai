"""
Rotas de clientes (CRUD), isoladas por usuário autenticado.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.cliente import Cliente
from app.models.user import User
from app.schemas.cliente import ClienteCreate, ClienteOut, ClienteUpdate
from app.schemas.common import MessageResponse, Paginated

router = APIRouter(prefix="/clientes", tags=["Clientes"])


async def _get_owned_cliente(cliente_id: int, user: User, db: AsyncSession) -> Cliente:
    """Recupera um cliente garantindo que pertença ao usuário."""
    result = await db.execute(
        select(Cliente).where(Cliente.id == cliente_id, Cliente.user_id == user.id)
    )
    cliente = result.scalar_one_or_none()
    if cliente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")
    return cliente


@router.get("", response_model=Paginated[ClienteOut])
async def list_clientes(
    q: str | None = Query(default=None, description="Busca por nome, CPF/CNPJ ou e-mail"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Paginated[ClienteOut]:
    """Lista clientes do usuário com paginação e busca opcional."""
    filters = [Cliente.user_id == user.id]
    if q:
        like = f"%{q}%"
        filters.append(
            (Cliente.nome.ilike(like)) | (Cliente.cpf.ilike(like)) | (Cliente.cnpj.ilike(like)) | (Cliente.email.ilike(like))
        )

    total = await db.scalar(select(func.count()).select_from(Cliente).where(*filters)) or 0
    result = await db.execute(
        select(Cliente).where(*filters).order_by(Cliente.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    items = result.scalars().all()

    return Paginated(
        items=[ClienteOut.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max((total + page_size - 1) // page_size, 1) if total else 0,
    )


@router.get("/{cliente_id}", response_model=ClienteOut)
async def get_cliente(
    cliente_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Cliente:
    """Retorna um cliente específico do usuário."""
    return await _get_owned_cliente(cliente_id, user, db)


@router.post("", response_model=ClienteOut, status_code=status.HTTP_201_CREATED)
async def create_cliente(
    payload: ClienteCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Cliente:
    """Cria um novo cliente vinculado ao usuário."""
    cliente = Cliente(user_id=user.id, **payload.model_dump())
    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.put("/{cliente_id}", response_model=ClienteOut)
async def update_cliente(
    cliente_id: int,
    payload: ClienteUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Cliente:
    """Atualiza um cliente do usuário."""
    cliente = await _get_owned_cliente(cliente_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cliente, field, value)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.delete("/{cliente_id}", response_model=MessageResponse)
async def delete_cliente(
    cliente_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Exclui um cliente e seus dados vinculados (LGPD)."""
    cliente = await _get_owned_cliente(cliente_id, user, db)
    await db.delete(cliente)
    await db.commit()
    return MessageResponse(message="Cliente excluído com sucesso.")
