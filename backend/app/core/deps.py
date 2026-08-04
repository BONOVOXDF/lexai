"""
Dependências compartilhadas do FastAPI (DI).

Fornece:
- `get_db`: sessão assíncrona do SQLAlchemy por requisição.
- `get_current_user`: autenticação via Bearer token JWT.
- `get_redis`: cliente Redis opcional.
"""

import logging
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.security import get_user_id_from_token
from app.database.session import async_session_factory
from app.models.user import User

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Fornece uma sessão de banco assíncrona e garante seu fechamento."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def _aplicar_expiracao_plano(db: AsyncSession, user: User) -> None:
    """Rebaixa para free automaticamente quando o acesso pago expira."""
    if user.plano != "free" and user.plano_expira_em is not None:
        expira = user.plano_expira_em
        if expira.tzinfo is None:
            expira = expira.replace(tzinfo=timezone.utc)
        if expira <= datetime.now(timezone.utc):
            user.plano = "free"
            user.plano_expira_em = None
            await db.commit()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Autentica o usuário atual a partir do token Bearer no header Authorization."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais não fornecidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = get_user_id_from_token(credentials.credentials, expected_type="access")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    await _aplicar_expiracao_plano(db, user)
    return user


async def get_redis():
    """Retorna o cliente Redis global ou None se indisponível."""
    from app.services.redis_client import get_redis_client

    return await get_redis_client()
