"""Schemas Pydantic para captura de leads do site."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LeadCreate(BaseModel):
    """Dados enviados pelo formulário de lead magnet."""

    nome: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    telefone: Optional[str] = Field(default=None, max_length=30)
    origem: Optional[str] = Field(default=None, max_length=100)


class LeadKitRequest(BaseModel):
    """Marca o download do kit por e-mail."""

    email: EmailStr


class LeadOut(BaseModel):
    """Lead retornado pela API (uso administrativo)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: str
    telefone: Optional[str] = None
    origem: Optional[str] = None
    kit_baixado: bool
    created_at: datetime
