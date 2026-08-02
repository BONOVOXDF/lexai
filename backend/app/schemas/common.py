"""Schemas Pydantic do projeto LEX AI."""

from typing import Generic, List, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Paginated(BaseModel, Generic[T]):
    """Resposta paginada genérica."""

    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int


class MessageResponse(BaseModel):
    """Resposta simples de mensagem."""

    message: str
