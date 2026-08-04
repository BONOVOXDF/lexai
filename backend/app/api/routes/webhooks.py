"""
Webhooks de serviços externos.

- POST /api/webhooks/mercadopago: notificações de preapproval (pagamento da
  assinatura). É público e atualiza o plano do usuário.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models.assinatura import Assinatura
from app.models.user import User
from app.services import mercadopago
from app.services.mercadopago import MercadoPagoError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

# Tipos de notificação relevantes para assinaturas.
TIPOS_PREAPPROVAL = {"preapproval", "preapproval_updated"}


@router.post("/mercadopago")
async def webhook_mercadopago(
    payload: dict,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Recebe notificações de assinatura do Mercado Pago.

    O payload típico é: {"type": "preapproval", "data": {"id": "<id>"}}.
    Consultamos a API para obter o status real e, se autorizado, elevamos
    o plano do usuário.
    """
    if payload.get("type") not in TIPOS_PREAPPROVAL:
        return {"ok": True}

    data = payload.get("data") or {}
    preapproval_id = str(data.get("id") or "")
    if not preapproval_id:
        logger.warning("Webhook do Mercado Pago sem preapproval id: %s", payload)
        return {"ok": True}

    try:
        info = await mercadopago.obter_preapproval(preapproval_id)
    except MercadoPagoError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )

    status_mp = str(info.get("status", "pending"))

    result = await db.execute(
        select(Assinatura).where(Assinatura.mp_preapproval_id == preapproval_id)
    )
    assinatura = result.scalar_one_or_none()
    if assinatura is None:
        logger.info("Preapproval %s não encontrado no banco; ignorando.", preapproval_id)
        return {"ok": True}

    assinatura.status = status_mp
    if status_mp == "authorized" and assinatura.data_aprovacao is None:
        assinatura.data_aprovacao = datetime.now(timezone.utc)

    if status_mp == "cancelled":
        assinatura.data_cancelamento = datetime.now(timezone.utc)

    await db.commit()

    # Reflete o status na conta do usuário.
    user_result = await db.execute(select(User).where(User.id == assinatura.user_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        return {"ok": True}

    if status_mp == "authorized":
        user.plano = assinatura.plano
    elif status_mp in ("cancelled", "paused"):
        if user.plano == assinatura.plano:
            user.plano = "free"
    await db.commit()

    logger.info(
        "Webhook Mercado Pago: preapproval %s -> %s (user=%s plano=%s).",
        preapproval_id,
        status_mp,
        assinatura.user_id,
        user.plano,
    )
    return {"ok": True}
