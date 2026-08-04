"""Modelo de assinatura/pagamento do Mercado Pago."""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Assinatura(Base, TimestampMixin):
    """
    Registro de compra de plano (pagamento único via PIX).

    Uma linha por pagamento: o plano fica ativo até `validade_ate`.
    """

    __tablename__ = "assinaturas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    plano: Mapped[str] = mapped_column(String(30), nullable=False)
    mp_preapproval_id: Mapped[Optional[str]] = mapped_column(
        String(100), unique=True, index=True, nullable=True
    )
    mp_payment_id: Mapped[Optional[str]] = mapped_column(
        String(100), unique=True, index=True, nullable=True
    )
    valor: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    external_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    validade_ate: Mapped[Optional[object]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    data_aprovacao: Mapped[Optional[object]] = mapped_column(DateTime(timezone=True), nullable=True)
    data_cancelamento: Mapped[Optional[object]] = mapped_column(DateTime(timezone=True), nullable=True)

    usuario: Mapped["User"] = relationship(back_populates="assinaturas")
