"""Modelo de intimação registrada manualmente (INTIMACOES)."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.processo import Processo
    from app.models.user import User


class Intimacao(Base, TimestampMixin):
    """Representa uma intimação publicada no DJEN registrada pelo advogado."""

    __tablename__ = "intimacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    processo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("processos.id"), index=True, nullable=True)
    cliente_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clientes.id"), index=True, nullable=True)
    numero_processo: Mapped[str] = mapped_column(String(50), nullable=False)
    tribunal: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    orgao: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    tipo: Mapped[str] = mapped_column(String(40), default="intimacao", nullable=False)
    data_publicacao: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    prazo: Mapped[Optional[date]] = mapped_column(Date, index=True, nullable=True)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    usuario: Mapped["User"] = relationship(back_populates="intimacoes")
    processo: Mapped[Optional["Processo"]] = relationship(back_populates="intimacoes")
    cliente: Mapped[Optional["Cliente"]] = relationship()
