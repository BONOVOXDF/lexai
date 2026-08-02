"""
Rotas de autenticação: registro, login, refresh, recuperação de senha,
login social (Google/Supabase) e obtenção do usuário atual.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.user import (
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserOut,
)
from app.services.rate_limit import check_rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Autenticação"])


async def _issue_tokens(user: User) -> TokenResponse:
    """Gera o par de tokens e monta a resposta de autenticação."""
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """
    Cria uma nova conta e retorna os tokens de acesso.

    Valida que as senhas coincidem e que o e-mail não está em uso.
    """
    if payload.senha != payload.confirmar_senha:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="As senhas não coincidem.")

    existing = await db.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Já existe uma conta com este e-mail.")

    user = User(
        nome=payload.nome.strip(),
        email=payload.email.lower(),
        senha_hash=hash_password(payload.senha),
        telefone=payload.telefone,
        oab=payload.oab,
        plano="free",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return await _issue_tokens(user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Autentica o usuário por e-mail e senha."""
    allowed, _ = await check_rate_limit(f"login:{payload.email.lower()}")
    if not allowed:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Muitas tentativas. Tente novamente em instantes.")

    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.senha, user.senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha incorretos.")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conta desativada. Contate o suporte.")

    return await _issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Renova o access token usando o refresh token."""
    decoded = decode_token(payload.refresh_token, expected_type="refresh")
    if decoded is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido ou expirado.")

    user_id = int(decoded["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado.")

    return await _issue_tokens(user)


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """
    Solicita recuperação de senha.

    Retorna um token de redefinição para uso com /auth/reset-password.
    Em produção, o token deve ser enviado por e-mail.
    """
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()
    if user is None:
        # Resposta genérica para não revelar e-mails existentes.
        return {"message": "Se o e-mail estiver cadastrado, você receberá instruções de recuperação."}

    token = create_access_token(user.id)
    logger.info("Token de recuperação gerado para %s (enviar por e-mail em produção).", user.email)
    return {"message": "Se o e-mail estiver cadastrado, você receberá instruções de recuperação.", "reset_token": token}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """Redefine a senha usando o token de recuperação."""
    decoded = decode_token(payload.token, expected_type="access")
    if decoded is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado.")

    user_id = int(decoded["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    user.senha_hash = hash_password(payload.nova_senha)
    await db.commit()
    return {"message": "Senha redefinida com sucesso."}


@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """
    Autentica via Google.

    O token pode ser:
    - Um token de acesso emitido pelo Supabase Auth (se configurado);
    - Um id_token do Google (validação simplificada em produção exige
      verificação de assinatura via biblioteca do Google).
    """
    email = _resolve_social_email(payload.token)
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token social inválido.")

    result = await db.execute(select(User).where(User.email == email.lower()))
    user = result.scalar_one_or_none()
    if user is None:
        nome = email.split("@")[0].replace(".", " ").title()
        user = User(
            nome=nome,
            email=email.lower(),
            senha_hash=hash_password(__import__("secrets").token_urlsafe(32)),
            plano="free",
            supabase_id=str(payload.token[:64]),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return await _issue_tokens(user)


def _resolve_social_email(token: str) -> str | None:
    """Tenta extrair o e-mail de um token social (Supabase JWT)."""
    try:
        payload = decode_token(token, expected_type="access")
        if payload and payload.get("email"):
            return payload["email"]
    except Exception:
        pass

    # Fallback: Supabase access token JWT sem tipo "access" definido.
    try:
        import jwt as pyjwt
        import base64
        import json

        parts = token.split(".")
        if len(parts) == 3:
            payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
            data = json.loads(base64.urlsafe_b64decode(payload_b64))
            email = data.get("email")
            if email:
                return email
    except Exception:
        pass
    return None


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> User:
    """Retorna o perfil do usuário autenticado."""
    return user
