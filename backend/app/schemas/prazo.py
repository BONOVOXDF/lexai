"""Schemas Pydantic para o kanban de prazos."""

from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.processo import StatusProcesso


class PrazoKanbanItem(BaseModel):
    """Processo exibido no quadro de prazos."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: str
    tribunal: Optional[str] = None
    classe: Optional[str] = None
    comarca: Optional[str] = None
    status: StatusProcesso
    prazo: Optional[date] = None
    cliente_id: Optional[int] = None
    cliente_nome: Optional[str] = None


class KanbanPrazosOut(BaseModel):
    """Quadro de prazos agrupado por faixa de vencimento."""

    colunas: dict[str, list[PrazoKanbanItem]]


class MoverPrazoRequest(BaseModel):
    """Destino de um card arrastado no kanban."""

    coluna: str
