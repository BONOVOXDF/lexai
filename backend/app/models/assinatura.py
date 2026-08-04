"""Modelo de assinatura do Mercado Pago."""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Assinatura(Base, TimestampMixin):
    """Assinatura recorrente vinculada a um usuário via Mercado Pago."""

    __tablename__ = "assinaturas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    plano: Mapped[str] = mapped_column(String(30), nullable=False)
    mp_preapproval_id: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    external_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    data_aprovacao: Mapped[Optional[object]] = mapped_column(DateTime(timezone=True), nullable=True)
    data_cancelamento: Mapped[Optional[object]] = mapped_column(DateTime(timezone=True), nullable=True)

    usuario: Mapped["User"] = relationship(back_populates="assinaturas")
