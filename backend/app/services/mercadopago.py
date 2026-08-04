"""
Integração com a API de assinaturas do Mercado Pago (preapproval).

Usa o token de acesso para criar e consultar assinaturas recorrentes.
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

MP_API_BASE = "https://api.mercadopago.com"
TIMEOUT_SECONDS = 20.0

# Status retornados pela API de preapproval.
STATUS_ATIVOS = {"authorized", "pending"}


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


async def criar_preapproval(*, plano: str, email: str, user_id: int) -> dict:
    """
    Cria uma assinatura recorrente mensal e retorna o JSON do Mercado Pago.

    O `init_point` do retorno é a URL de checkout onde o usuário paga.
    """
    preco = settings.precos_por_plano.get(plano)
    if preco is None:
        raise MercadoPagoError(f"Plano inválido: {plano}.")

    payload = {
        "reason": f"Assinatura LEX AI - Plano {plano.title()}",
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": preco,
            "currency_id": "BRL",
        },
        "payer_email": email,
        "external_reference": f"user:{user_id}",
        "back_url": f"{settings.APP_URL}/assinatura",
        "notification_url": f"{settings.BACKEND_URL}/api/webhooks/mercadopago",
        "status": "pending",
    }
    logger.info("Criando preapproval do Mercado Pago para user=%s plano=%s", user_id, plano)
    return await _request("POST", f"{MP_API_BASE}/preapproval", json=payload)


async def obter_preapproval(preapproval_id: str) -> dict:
    """Consulta a situação atual de uma assinatura."""
    return await _request("GET", f"{MP_API_BASE}/preapproval/{preapproval_id}")


async def cancelar_preapproval(preapproval_id: str) -> dict:
    """Cancela uma assinatura no Mercado Pago."""
    logger.info("Cancelando preapproval %s.", preapproval_id)
    return await _request("PUT", f"{MP_API_BASE}/preapproval/{preapproval_id}", json={"status": "cancelled"})
