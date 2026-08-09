"""Schemas Pydantic para documentos."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.documento import TipoDocumento


class DocumentoOut(BaseModel):
    """Documento retornado pela API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    processo_id: Optional[int] = None
    cliente_id: Optional[int] = None
    nome_original: str
    tipo: TipoDocumento
    tamanho_bytes: int
    mime_type: Optional[str] = None
    resumo: Optional[str] = None
    status: str
    is_indexed: bool
    created_at: datetime


class DocumentoUpdate(BaseModel):
    """Dados editáveis de um documento."""

    nome_original: Optional[str] = None
    processo_id: Optional[int] = None
    cliente_id: Optional[int] = None


class DocumentoResumoOut(BaseModel):
    """Resultado do resumo automático de um documento."""

    id: int
    resumo: str


class DocumentoPesquisaResult(BaseModel):
    """Resultado individual da pesquisa textual."""

    id: int
    nome_original: str
    trecho: str
    score: float


class DocumentoGeradoRequest(BaseModel):
    """Requisição para gerar um documento a partir de um modelo."""

    modelo: str
    cliente_id: int


class DocumentoGeradoOut(BaseModel):
    """Documento gerado a partir de um modelo preenchido."""

    modelo: str
    titulo: str
    conteudo: str
