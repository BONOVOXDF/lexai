"""
Integração com a API de pagamentos do Mercado Pago (PIX único).

Usa o token de acesso para criar pagamentos PIX e consultar o status.
"""

import logging
import uuid

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

MP_API_BASE = "https://api.mercadopago.com"
TIMEOUT_SECONDS = 20.0

# Status do pagamento.
STATUS_APROVADO = {"approved"}
STATUS_AGUARDANDO = {"pending", "in_process"}


def mp_configurado() -> bool:
    """True quando o token de acesso foi configurado."""
    return bool(settings.MP_ACCESS_TOKEN)


class MercadoPagoError(Exception):
    """Falha na comunicação com o Mercado Pago."""


async def _request(method: str, url: str, **kwargs) -> dict:
    if not mp_configurado():
        raise MercadoPagoError("Mercado Pago não configurado no servidor.")

    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {settings.MP_ACCESS_TOKEN}"
    headers["Content-Type"] = "application/json"

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.request(method, url, headers=headers, **kwargs)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        logger.error("Timeout ao chamar o Mercado Pago (%s %s).", method, url)
        raise MercadoPagoError("O Mercado Pago demorou para responder.")
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Mercado Pago respondeu %s em %s %s: %s",
            exc.response.status_code,
            method,
            url,
            exc.response.text[:500],
        )
        raise MercadoPagoError(f"Mercado Pago retornou erro {exc.response.status_code}.")
    except Exception:
        logger.exception("Falha ao chamar o Mercado Pago.")
        raise MercadoPagoError("Não foi possível falar com o Mercado Pago.")


async def criar_pagamento_pix(*, plano: str, email: str, user_id: int) -> dict:
    """
    Cria um pagamento PIX de valor único e retorna o JSON do Mercado Pago.

    O campo `point_of_interaction.transaction_data` traz o QR Code
    (`qr_code` para copiar e `qr_code_base64` para exibir).
    """
    preco = settings.precos_por_plano.get(plano)
    if preco is None:
        raise MercadoPagoError(f"Plano inválido: {plano}.")

    payload = {
        "transaction_amount": preco,
        "description": f"Plano {plano.title()} LEX AI - {settings.PLANO_DURACAO_DIAS} dias",
        "payment_method_id": "pix",
        "payer": {"email": email},
        "external_reference": f"user:{user_id}:plano:{plano}",
        "notification_url": f"{settings.BACKEND_URL}/api/webhooks/mercadopago",
    }
    headers = {"X-Idempotency-Key": uuid.uuid4().hex}
    logger.info("Criando pagamento PIX do Mercado Pago para user=%s plano=%s", user_id, plano)
    return await _request("POST", f"{MP_API_BASE}/v1/payments", json=payload, headers=headers)


async def obter_pagamento(payment_id: str) -> dict:
    """Consulta a situação atual de um pagamento."""
    return await _request("GET", f"{MP_API_BASE}/v1/payments/{payment_id}")
