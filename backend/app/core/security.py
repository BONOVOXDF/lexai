"""
Segurança: hashing de senhas (BCrypt), criação/validação de tokens JWT
e utilitários de refresh tokens.

Implementa o padrão de segurança recomendado:
- Hash de senhas com BCrypt (salt automático).
- Tokens JWT assinados com HMAC-SHA256.
- Claims padrão: sub (user id), type (access|refresh), exp, iat.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt
import jwt
from jwt import PyJWTError

from app.core.config import settings

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """Gera um hash BCrypt seguro para a senha fornecida."""
    rounds = settings.BCRYPT_ROUNDS
    salt = bcrypt.gensalt(rounds=rounds)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Compara uma senha em texto puro com o hash armazenado."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        logger.warning("Hash de senha inválido encontrado no banco.")
        return False


def _create_token(user_id: int, token_type: str, expires_minutes: int) -> str:
    """Cria um token JWT para o usuário com o tipo e expiração informados."""
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "type": token_type,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(user_id: int) -> str:
    """Gera um access token de curta duração para o usuário."""
    return _create_token(user_id, "access", settings.ACCESS_TOKEN_EXPIRE_MINUTES)


def create_refresh_token(user_id: int) -> str:
    """Gera um refresh token de longa duração para o usuário."""
    return _create_token(user_id, "refresh", settings.REFRESH_TOKEN_EXPIRE_MINUTES)


def create_portal_access_token(cliente_id: int, advogado_user_id: int) -> str:
    """Gera um access token para o acesso de um cliente ao portal."""
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": str(cliente_id),
        "type": "access",
        "tipo_conta": "portal",
        "advogado_id": str(advogado_user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str, expected_type: str = "access") -> Optional[Dict[str, Any]]:
    """
    Decodifica e valida um token JWT.

    Retorna o payload decodificado ou `None` se o token for inválido,
    expirado ou do tipo incorreto.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != expected_type:
            logger.warning("Token com tipo inesperado: %s", payload.get("type"))
            return None
        return payload
    except PyJWTError as exc:
        logger.debug("Falha ao decodificar token: %s", exc)
        return None


def get_user_id_from_token(token: str, expected_type: str = "access") -> Optional[int]:
    """Extrai o id do usuário de um token válido, ou `None` se inválido."""
    payload = decode_token(token, expected_type)
    if not payload:
        return None
    try:
        return int(payload["sub"])
    except (KeyError, ValueError, TypeError):
        return None
