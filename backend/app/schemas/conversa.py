"""Schemas Pydantic para conversas e mensagens."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.conversa import TipoMensagem


class MensagemOut(BaseModel):
    """Mensagem retornada pela API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    conversa_id: int
    tipo: TipoMensagem
    conteudo: str
    fontes: Optional[str] = None
    precisa_revisao: bool
    created_at: datetime


class ConversaOut(BaseModel):
    """Conversa retornada pela API (sem mensagens)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    titulo: str
    is_favorita: bool
    created_at: datetime
    updated_at: datetime


class ConversaDetail(ConversaOut):
    """Conversa com mensagens aninhadas."""

    mensagens: List[MensagemOut] = []


class ConversaCreate(BaseModel):
    """Dados para criar uma nova conversa."""

    titulo: str = "Nova conversa"


class ConversaUpdate(BaseModel):
    """Dados para atualizar uma conversa."""

    titulo: Optional[str] = None
    is_favorita: Optional[bool] = None


class MensagemCreate(BaseModel):
    """Pergunta enviada ao assistente."""

    conteudo: str
    conversa_id: Optional[int] = None


class MensagemAIResult(BaseModel):
    """Resposta do assistente IA."""

    mensagem: MensagemOut
    conversa_id: int
