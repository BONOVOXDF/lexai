"""Schemas Pydantic para autenticação e usuários."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    """Dados comuns de um usuário."""

    nome: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    telefone: Optional[str] = Field(default=None, max_length=30)
    oab: Optional[str] = Field(default=None, max_length=30)


class UserCreate(UserBase):
    """Dados necessários para criar uma conta."""

    senha: str = Field(..., min_length=8, max_length=128)
    confirmar_senha: str = Field(..., min_length=8, max_length=128)


class UserUpdate(BaseModel):
    """Dados editáveis do perfil do usuário."""

    nome: Optional[str] = Field(default=None, min_length=2, max_length=255)
    telefone: Optional[str] = Field(default=None, max_length=30)
    oab: Optional[str] = Field(default=None, max_length=30)
    avatar_url: Optional[str] = None
    preferencias: Optional[str] = None


class UserUpdatePassword(BaseModel):
    """Troca de senha do usuário logado."""

    senha_atual: str
    nova_senha: str = Field(..., min_length=8, max_length=128)


class UserOut(UserBase):
    """Usuário retornado pela API (nunca inclui senha)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    plano: str
    is_active: bool
    avatar_url: Optional[str] = None
    created_at: datetime


class LoginRequest(BaseModel):
    """Credenciais para autenticação."""

    email: EmailStr
    senha: str


class TokenResponse(BaseModel):
    """Resposta de autenticação com tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(BaseModel):
    """Requisição para renovar o access token."""

    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    """Requisição de recuperação de senha."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Redefinição de senha com token de recuperação."""

    token: str
    nova_senha: str = Field(..., min_length=8, max_length=128)


class GoogleAuthRequest(BaseModel):
    """Autenticação via Google (token do Google ou credenciais id_token)."""

    token: str
