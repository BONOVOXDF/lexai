"""
Rate limiting baseado em Redis (janela deslizante por usuário).

Opera de forma degradada quando o Redis está indisponível.
"""

import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


async def check_rate_limit(identifier: str) -> tuple[bool, Optional[int]]:
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

    key = f"rate:{identifier}"
    try:
        current = await redis.incr(key)
        if current == 1:
            await redis.expire(key, 60)
        if current > settings.RATE_LIMIT_PER_MINUTE:
            ttl = await redis.ttl(key)
            return False, max(int(ttl), 1)
        return True, None
    except Exception as exc:
        logger.warning("Rate limit indisponível: %s", exc)
        return True, None
