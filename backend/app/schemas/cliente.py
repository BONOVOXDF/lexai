"""Schemas Pydantic para clientes."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ClienteBase(BaseModel):
    """Dados comuns de um cliente."""

    nome: str = Field(..., min_length=2, max_length=255)
    cpf: Optional[str] = Field(default=None, max_length=14)
    cnpj: Optional[str] = Field(default=None, max_length=18)
    telefone: Optional[str] = Field(default=None, max_length=30)
    email: Optional[EmailStr] = None
    endereco: Optional[str] = Field(default=None, max_length=500)
    tipo: str = Field(default="pessoa_fisica", max_length=20)
    anotacoes: Optional[str] = None


class ClienteCreate(ClienteBase):
    """Dados para criar um cliente."""

    pass


class ClienteUpdate(BaseModel):
    """Dados para atualizar um cliente (campos opcionais)."""

    nome: Optional[str] = Field(default=None, min_length=2, max_length=255)
    cpf: Optional[str] = Field(default=None, max_length=14)
    cnpj: Optional[str] = Field(default=None, max_length=18)
    telefone: Optional[str] = Field(default=None, max_length=30)
    email: Optional[EmailStr] = None
    endereco: Optional[str] = Field(default=None, max_length=500)
    tipo: Optional[str] = Field(default=None, max_length=20)
    anotacoes: Optional[str] = None


class ClienteOut(ClienteBase):
    """Cliente retornado pela API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
