"""
Webhooks de serviços externos.

- POST /api/webhooks/mercadopago: notificações de pagamento (PIX) do Mercado
  Pago. É público e atualiza o plano do usuário ao confirmar o pagamento.
"""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db
from app.models.assinatura import Assinatura
from app.models.user import User
from app.services import mercadopago
from app.services.mercadopago import MercadoPagoError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

# Tipos de notificação relevantes para pagamentos.
TIPOS_PAYMENT = {"payment", "payment.created", "payment.updated", "payment.status.updated"}


@router.post("/mercadopago")
async def webhook_mercadopago(
    payload: dict,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Recebe notificações de pagamento do Mercado Pago.

    O payload típico é: {"type": "payment", "data": {"id": "<id>"}}.
    Consultamos a API para obter o status real e, se aprovado, ativamos o
    plano do usuário por `PLANO_DURACAO_DIAS` dias.
    """
    if payload.get("type") not in TIPOS_PAYMENT:
        return {"ok": True}

    data = payload.get("data") or {}
    payment_id = str(data.get("id") or "")
    if not payment_id:
        logger.warning("Webhook do Mercado Pago sem payment id: %s", payload)
        return {"ok": True}

    result = await db.execute(select(Assinatura).where(Assinatura.mp_payment_id == payment_id))
    assinatura = result.scalar_one_or_none()
    if assinatura is None:
        logger.info("Pagamento %s não encontrado no banco; ignorando.", payment_id)
        return {"ok": True}

    try:
        info = await mercadopago.obter_pagamento(payment_id)
    except MercadoPagoError as exc:
        # Retorna ok para evitar reenvio em cascata; o status é reconciliado depois.
        logger.warning("Falha ao consultar pagamento %s: %s", payment_id, exc)
        return {"ok": True}

    status_mp = str(info.get("status", "pending"))
    agora = datetime.now(timezone.utc)

    assinatura.status = status_mp
    if status_mp == "approved":
        if assinatura.data_aprovacao is None:
            assinatura.data_aprovacao = agora
        if assinatura.validade_ate is None:
            assinatura.validade_ate = agora + timedelta(days=settings.PLANO_DURACAO_DIAS)
    elif status_mp in ("cancelled", "refunded", "charged_back", "rejected", "expired"):
        assinatura.data_cancelamento = agora
    await db.commit()

    user_result = await db.execute(select(User).where(User.id == assinatura.user_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        return {"ok": True}

    if status_mp == "approved":
        user.plano = assinatura.plano
        user.plano_expira_em = assinatura.validade_ate
    elif status_mp in ("cancelled", "refunded", "charged_back", "rejected"):
        if user.plano == assinatura.plano:
            user.plano = "free"
            user.plano_expira_em = None
    await db.commit()

    logger.info(
        "Webhook Mercado Pago: payment %s -> %s (user=%s plano=%s expira=%s).",
        payment_id,
        status_mp,
        assinatura.user_id,
        user.plano,
        user.plano_expira_em,
    )
    return {"ok": True}
