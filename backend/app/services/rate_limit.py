"""
Rate limiting baseado em Redis (janela deslizante por usuário).

Opera de forma degradada quando o Redis está indisponível.
"""

import logging
from typing import Optional

from fastapi import HTTPException, status

from app.core.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)

# Limites de chamadas de IA por minuto, conforme o plano do usuário.
PLANO_LIMITES_IA: dict[str, int] = {
    "free": 5,
    "pro": 30,
    "empresa": 60,
}


def limite_ia_por_plano(plano: str) -> int:
    """Retorna o limite de chamadas IA/minuto para o plano informado."""
    return PLANO_LIMITES_IA.get(plano or "", 5)


async def check_ia_quota(user: User) -> None:
    """
    Verifica a cota de chamadas de IA do usuário no período de 1 minuto.

    Lança HTTPException 429 quando o limite é excedido.
    """
    allowed, retry = await check_rate_limit(
        f"ia:{user.id}", max_per_minute=limite_ia_por_plano(user.plano)
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Você atingiu o limite de consultas com IA deste plano. "
                "Aguarde um instante ou faça upgrade para o plano Pro."
            ),
        )


async def check_rate_limit(
    identifier: str, max_per_minute: Optional[int] = None
) -> tuple[bool, Optional[int]]:
    """
    Verifica se a requisição excede o limite.

    Retorna (permitido, retry_after_seconds). Quando permitido,
    retry_after_seconds é None.
    """
    if not settings.RATE_LIMIT_ENABLED:
        return True, None

    from app.services.redis_client import get_redis_client

    redis = await get_redis_client()
    if redis is None:
        return True, None

    limite = max_per_minute or settings.RATE_LIMIT_PER_MINUTE
    key = f"rate:{identifier}"
    try:
        current = await redis.incr(key)
        if current == 1:
            await redis.expire(key, 60)
        if current > limite:
            ttl = await redis.ttl(key)
            return False, max(int(ttl), 1)
        return True, None
    except Exception as exc:
        logger.warning("Rate limit indisponível: %s", exc)
        return True, None
