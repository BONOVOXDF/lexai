"""Schemas Pydantic para assinaturas (Mercado Pago)."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AssinaturaCheckoutRequest(BaseModel):
    """Plano escolhido no checkout."""

    plano: str = Field(..., pattern="^(pro|empresa)$")


class AssinaturaCheckoutResponse(BaseModel):
    """Link de pagamento do Mercado Pago."""

    init_point: str
    preapproval_id: str


class AssinaturaOut(BaseModel):
    """Situação da assinatura do usuário atual."""

    model_config = ConfigDict(from_attributes=True)

    plano_atual: str
    status: Optional[str] = None
    preapproval_id: Optional[str] = None
    data_aprovacao: Optional[datetime] = None
    data_cancelamento: Optional[datetime] = None
