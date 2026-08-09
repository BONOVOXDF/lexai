"""
Rotas de intimações (DJEN): registro manual com integração ao prazo do
processo vinculado (kanban e alerta diário).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_db
from app.models.cliente import Cliente
from app.models.intimacao import Intimacao
from app.models.processo import Processo
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.intimacao import IntimacaoCreate, IntimacaoOut, IntimacaoUpdate

router = APIRouter(prefix="/intimacoes", tags=["Intimações"])


async def _get_owned_intimacao(intimacao_id: int, user: User, db: AsyncSession) -> Intimacao:
    result = await db.execute(
        select(Intimacao)
        .options(selectinload(Intimacao.cliente), selectinload(Intimacao.processo))
        .where(Intimacao.id == intimacao_id, Intimacao.user_id == user.id)
    )
    intimacao = result.scalar_one_or_none()
    if intimacao is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intimação não encontrada.")
    return intimacao


def _to_out(intimacao: Intimacao) -> IntimacaoOut:
    out = IntimacaoOut.model_validate(intimacao)
    out.cliente_nome = intimacao.cliente.nome if intimacao.cliente else None
    return out


async def _validar_vinculos(
    db: AsyncSession,
    user: User,
    processo_id: Optional[int],
    cliente_id: Optional[int],
) -> None:
    """Garante que processo e cliente pertencem ao usuário (e são compatíveis)."""
    if processo_id is not None:
        processo = await db.scalar(
            select(Processo).where(Processo.id == processo_id, Processo.user_id == user.id)
        )
        if processo is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Processo não encontrado.")
        if cliente_id is not None and processo.cliente_id and processo.cliente_id != cliente_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O cliente informado não pertence a este processo.",
            )
    if cliente_id is not None:
        cliente = await db.scalar(
            select(Cliente).where(Cliente.id == cliente_id, Cliente.user_id == user.id)
        )
        if cliente is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")


async def _sincronizar_prazo(
    db: AsyncSession,
    intimacao: Intimacao,
    atualizar: bool,
) -> None:
    """Atualiza o prazo do processo vinculado quando a intimação define um."""
    if not atualizar or intimacao.processo_id is None or intimacao.prazo is None:
        return
    processo = await db.scalar(select(Processo).where(Processo.id == intimacao.processo_id))
    if processo is not None:
        processo.prazo = intimacao.prazo


@router.get("", response_model=list[IntimacaoOut])
async def listar_intimacoes(
    processo_id: Optional[int] = None,
    sem_prazo: bool = Query(default=False, description="Filtra as que ainda não têm prazo"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[IntimacaoOut]:
    """Lista as intimações do usuário, ordenadas por prazo."""
    filters = [Intimacao.user_id == user.id]
    if processo_id:
        filters.append(Intimacao.processo_id == processo_id)
    if sem_prazo:
        filters.append(Intimacao.prazo.is_(None))

    result = await db.execute(
        select(Intimacao)
        .options(selectinload(Intimacao.cliente))
        .where(*filters)
        .order_by(Intimacao.prazo.asc().nulls_last(), Intimacao.created_at.desc())
    )
    return [_to_out(i) for i in result.scalars().all()]


@router.post("", response_model=IntimacaoOut, status_code=status.HTTP_201_CREATED)
async def criar_intimacao(
    payload: IntimacaoCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IntimacaoOut:
    """Registra uma intimação e, se houver prazo, atualiza o processo."""
    await _validar_vinculos(db, user, payload.processo_id, payload.cliente_id)

    dados = payload.model_dump(exclude={"atualizar_prazo_processo"})
    intimacao = Intimacao(user_id=user.id, **dados)
    db.add(intimacao)
    await db.commit()
    await db.refresh(intimacao)

    await _sincronizar_prazo(db, intimacao, payload.atualizar_prazo_processo)
    await db.commit()

    return _to_out(await _get_owned_intimacao(intimacao.id, user, db))


@router.put("/{intimacao_id}", response_model=IntimacaoOut)
async def atualizar_intimacao(
    intimacao_id: int,
    payload: IntimacaoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IntimacaoOut:
    """Atualiza uma intimação e re-sincroniza o prazo do processo se pedido."""
    intimacao = await _get_owned_intimacao(intimacao_id, user, db)

    dados = payload.model_dump(exclude={"atualizar_prazo_processo"}, exclude_unset=True)
    for campo, valor in dados.items():
        setattr(intimacao, campo, valor)

    await _validar_vinculos(db, user, intimacao.processo_id, intimacao.cliente_id)
    await db.commit()
    await _sincronizar_prazo(db, intimacao, payload.atualizar_prazo_processo)
    await db.commit()

    return _to_out(await _get_owned_intimacao(intimacao.id, user, db))


@router.delete("/{intimacao_id}", response_model=MessageResponse)
async def excluir_intimacao(
    intimacao_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Exclui uma intimação."""
    intimacao = await _get_owned_intimacao(intimacao_id, user, db)
    await db.delete(intimacao)
    await db.commit()
    return MessageResponse(message="Intimação excluída com sucesso.")
