"""
Cliente Redis global com inicialização lazy e tolerância a falhas.

O Redis é utilizado para rate limiting e cache. Caso o serviço não
esteja disponível, o sistema opera degradado (sem cache/rate limit).
"""

import logging
from typing import Optional

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Optional[aioredis.Redis] = None


async def get_redis_client() -> Optional[aioredis.Redis]:
    """Retorna o cliente Redis global, criando-o sob demanda."""
    global _client
    if _client is None:
        try:
            _client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            await _client.ping()
            logger.info("Redis conectado em %s", settings.REDIS_URL)
        except Exception as exc:  # pragma: no cover - degradação
            logger.warning("Redis indisponível (%s). Operando sem cache/rate limit.", exc)
            _client = None
    return _client


async def close_redis_client() -> None:
    """Fecha o cliente Redis na finalização da aplicação."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
