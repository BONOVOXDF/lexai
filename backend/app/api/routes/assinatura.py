"""
Rotas de assinatura (pagamento PIX via Mercado Pago).

- POST /api/assinatura/checkout: cria o pagamento PIX e devolve o QR Code.
- GET /api/assinatura: situação do plano do usuário atual.
- POST /api/assinatura/cancelar: encerra o acesso pago e rebaixa para free.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_db
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


def _agora_utc() -> datetime:
    return datetime.now(timezone.utc)


def _normalizar(dt: Optional[datetime]) -> Optional[datetime]:
    """Garante datetime com timezone (SQLite armazena sem timezone)."""
    if dt is None:
        return None
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


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
    """Cria o pagamento PIX no Mercado Pago e devolve o QR Code."""
    if not mercadopago.mp_configurado():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="O pagamento ainda não está disponível neste servidor.",
        )

    existente = await _ultima_assinatura(db, user.id)
    if existente is not None and existente.status == "approved":
        validade = _normalizar(existente.validade_ate)
        if validade is not None and validade > _agora_utc():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Você já possui um plano ativo. Aguarde o vencimento para renovar.",
            )

    try:
        pagamento = await mercadopago.criar_pagamento_pix(
            plano=payload.plano, email=user.email, user_id=user.id
        )
    except MercadoPagoError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )

    transaction_data = (pagamento.get("point_of_interaction") or {}).get("transaction_data") or {}
    assinatura = Assinatura(
        user_id=user.id,
        plano=payload.plano,
        mp_payment_id=str(pagamento["id"]),
        status=str(pagamento.get("status", "pending")),
        valor=pagamento.get("transaction_amount"),
        external_reference=pagamento.get("external_reference"),
    )
    db.add(assinatura)
    await db.commit()

    return AssinaturaCheckoutResponse(
        payment_id=str(pagamento["id"]),
        qr_code=transaction_data.get("qr_code", ""),
        qr_code_base64=transaction_data.get("qr_code_base64", ""),
        transaction_amount=pagamento.get("transaction_amount") or 0.0,
        status=str(pagamento.get("status", "pending")),
    )


@router.get("", response_model=AssinaturaOut)
async def situacao_assinatura(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AssinaturaOut:
    """Retorna a situação do plano do usuário atual."""
    assinatura = await _ultima_assinatura(db, user.id)
    return AssinaturaOut(
        plano_atual=user.plano,
        status=assinatura.status if assinatura else None,
        payment_id=assinatura.mp_payment_id if assinatura else None,
        plano_expira_em=user.plano_expira_em,
        data_aprovacao=assinatura.data_aprovacao if assinatura else None,
        data_cancelamento=assinatura.data_cancelamento if assinatura else None,
        precos=settings.precos_por_plano,
    )


@router.post("/cancelar")
async def cancelar_assinatura(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Encerra o acesso pago e rebaixa o usuário para o plano free."""
    assinatura = await _ultima_assinatura(db, user.id)
    if assinatura is None or assinatura.status not in (
        mercadopago.STATUS_APROVADO | mercadopago.STATUS_AGUARDANDO
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum plano ativo ou aguardando pagamento encontrado.",
        )

    assinatura.status = "cancelled"
    assinatura.data_cancelamento = _agora_utc()
    if user.plano != "free":
        user.plano = "free"
        user.plano_expira_em = None
    await db.commit()

    return {"ok": True, "plano": "free"}
