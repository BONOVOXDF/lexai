"""Modelo de usuário (USERS)."""

from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.assinatura import Assinatura
    from app.models.cliente import Cliente
    from app.models.conversa import Conversa
    from app.models.documento import Documento
    from app.models.peticao import Peticao
    from app.models.processo import Processo


class User(Base, TimestampMixin):
    """Representa um usuário da plataforma LEX AI."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    telefone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    oab: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    plano: Mapped[str] = mapped_column(String(30), default="free", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    supabase_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    preferencias: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    clientes: Mapped[List["Cliente"]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan"
    )
    processos: Mapped[List["Processo"]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan"
    )
    documentos: Mapped[List["Documento"]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan"
    )
    conversas: Mapped[List["Conversa"]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan"
    )
    peticoes: Mapped[List["Peticao"]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan"
    )
    assinaturas: Mapped[List["Assinatura"]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan"
    )
