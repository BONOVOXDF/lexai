"""Modelo de cliente (CLIENTES)."""

from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.documento import Documento
    from app.models.portal_acesso import PortalAcesso
    from app.models.processo import Processo
    from app.models.user import User


class Cliente(Base, TimestampMixin):
    """Representa um cliente do escritório de advocacia."""

    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    cpf: Mapped[Optional[str]] = mapped_column(String(14), nullable=True, index=True)
    cnpj: Mapped[Optional[str]] = mapped_column(String(18), nullable=True)
    telefone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    endereco: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    tipo: Mapped[str] = mapped_column(String(20), default="pessoa_fisica", nullable=False)
    anotacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    usuario: Mapped["User"] = relationship(back_populates="clientes")
    portal_acesso: Mapped[Optional["PortalAcesso"]] = relationship(
        back_populates="cliente", cascade="all, delete-orphan", uselist=False
    )
    processos: Mapped[List["Processo"]] = relationship(
        back_populates="cliente", cascade="all, delete-orphan"
    )
    documentos: Mapped[List["Documento"]] = relationship(
        back_populates="cliente", cascade="all, delete-orphan"
    )
