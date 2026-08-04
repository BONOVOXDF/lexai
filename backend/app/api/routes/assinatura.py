"""
Rotas de assinatura (checkout via Mercado Pago).

- POST /api/assinatura/checkout: cria a assinatura e devolve o link de pagamento.
- POST /api/webhooks/mercadopago: recebe notificações do Mercado Pago e
  atualiza o plano do usuário (endpoint público).
- GET /api/assinatura: situação da assinatura do usuário atual.
- POST /api/assinatura/cancelar: cancela a assinatura ativa.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.core.config import settings
from app.models.assinatura import Assinatura
from app.models.user import User
from app.schemas.assinatura import (
    AssinaturaCheckoutRequest,
    AssinaturaCheckoutResponse,
    AssinaturaOut,
)
from app.services import mercadopago
from app.services.mercadopago import MercadoPagoError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assinatura", tags=["Assinatura"])


async def _ultima_assinatura(db: AsyncSession, user_id: int) -> Optional[Assinatura]:
    result = await db.execute(
        select(Assinatura)
        .where(Assinatura.user_id == user_id)
        .order_by(Assinatura.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


@router.post("/checkout", response_model=AssinaturaCheckoutResponse)
async def criar_checkout(
    payload: AssinaturaCheckoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AssinaturaCheckoutResponse:
    """Cria a assinatura no Mercado Pago e devolve o link de pagamento."""
    if not mercadopago.mp_configurado():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="O pagamento ainda não está disponível neste servidor.",
        )

    existente = await _ultima_assinatura(db, user.id)
    if existente is not None and existente.status in mercadopago.STATUS_ATIVOS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Você já possui uma assinatura ativa ou pendente de pagamento.",
        )

    try:
        preapproval = await mercadopago.criar_preapproval(
            plano=payload.plano, email=user.email, user_id=user.id
        )
    except MercadoPagoError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )

    assinatura = Assinatura(
        user_id=user.id,
        plano=payload.plano,
        mp_preapproval_id=str(preapproval["id"]),
        status=str(preapproval.get("status", "pending")),
        external_reference=preapproval.get("external_reference"),
    )
    db.add(assinatura)
    await db.commit()

    return AssinaturaCheckoutResponse(
        init_point=preapproval["init_point"],
        preapproval_id=str(preapproval["id"]),
    )


@router.get("", response_model=AssinaturaOut)
async def situacao_assinatura(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AssinaturaOut:
    """Retorna a situação da assinatura do usuário atual."""
    assinatura = await _ultima_assinatura(db, user.id)
    return AssinaturaOut(
        plano_atual=user.plano,
        status=assinatura.status if assinatura else None,
        preapproval_id=assinatura.mp_preapproval_id if assinatura else None,
        data_aprovacao=assinatura.data_aprovacao if assinatura else None,
        data_cancelamento=assinatura.data_cancelamento if assinatura else None,
    )


@router.post("/cancelar")
async def cancelar_assinatura(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Cancela a assinatura ativa e rebaixa o usuário para o plano free."""
    assinatura = await _ultima_assinatura(db, user.id)
    if assinatura is None or assinatura.status not in mercadopago.STATUS_ATIVOS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhuma assinatura ativa encontrada.",
        )

    try:
        await mercadopago.cancelar_preapproval(assinatura.mp_preapproval_id)
    except MercadoPagoError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )

    from datetime import datetime, timezone

    assinatura.status = "cancelled"
    assinatura.data_cancelamento = datetime.now(timezone.utc)
    user.plano = "free"
    await db.commit()

    return {"ok": True, "plano": "free"}
