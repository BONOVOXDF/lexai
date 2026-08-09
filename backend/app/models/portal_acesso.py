"""Modelo de acesso do cliente ao portal (PORTAL_ACESSOS)."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.user import User


class PortalAcesso(Base, TimestampMixin):
    """Credenciais e convite de um cliente no portal do escritório."""

    __tablename__ = "portal_acessos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"), unique=True, index=True, nullable=False)
    advogado_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    senha_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    convite_token: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    convite_expira: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    cliente: Mapped["Cliente"] = relationship(back_populates="portal_acesso")
    advogado: Mapped["User"] = relationship()
