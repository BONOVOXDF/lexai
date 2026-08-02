"""Schemas Pydantic para petições."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.peticao import TipoPeticao


class PeticaoBase(BaseModel):
    """Dados comuns de uma petição."""

    titulo: str
    tipo: TipoPeticao = TipoPeticao.PERSONALIZADO
    conteudo: str = ""
    processo_numero: Optional[str] = None
    tribunal: Optional[str] = None
    partes: Optional[str] = None


class PeticaoCreate(PeticaoBase):
    """Dados para criar uma petição."""

    pass


class PeticaoUpdate(BaseModel):
    """Dados para atualizar uma petição."""

    titulo: Optional[str] = None
    tipo: Optional[TipoPeticao] = None
    conteudo: Optional[str] = None
    processo_numero: Optional[str] = None
    tribunal: Optional[str] = None
    partes: Optional[str] = None


class PeticaoOut(PeticaoBase):
    """Petição retornada pela API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime


class PeticaoGenerateRequest(BaseModel):
    """Parâmetros para gerar uma petição via IA."""

    tipo: TipoPeticao
    contexto: str
    processo_numero: Optional[str] = None
    tribunal: Optional[str] = None
    cliente_nome: Optional[str] = None
    cliente_documento: Optional[str] = None
    partes: Optional[str] = None


class ExportFormat(str):
    """Formatos de exportação suportados."""

    WORD = "word"
    PDF = "pdf"
