"""Schemas Pydantic para assinaturas (Mercado Pago)."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AssinaturaCheckoutRequest(BaseModel):
    """Plano escolhido no checkout."""

    plano: str = Field(..., pattern="^(pro|empresa)$")


class AssinaturaCheckoutResponse(BaseModel):
    """Dados do pagamento PIX criado no Mercado Pago."""

    payment_id: str
    qr_code: str
    qr_code_base64: str
    transaction_amount: float
    status: str


class AssinaturaOut(BaseModel):
    """Situação do plano do usuário atual."""

    model_config = ConfigDict(from_attributes=True)

    plano_atual: str
    status: Optional[str] = None
    payment_id: Optional[str] = None
    plano_expira_em: Optional[datetime] = None
    data_aprovacao: Optional[datetime] = None
    data_cancelamento: Optional[datetime] = None
    precos: Optional[dict[str, float]] = None
