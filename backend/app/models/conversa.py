"""Modelos de conversa e mensagem do Assistente IA (CONVERSAS)."""

from __future__ import annotations

import enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class TipoMensagem(str, enum.Enum):
    """Direção de uma mensagem na conversa."""

    USUARIO = "usuario"
    ASSISTENTE = "assistente"


class Conversa(Base, TimestampMixin):
    """Representa uma conversa do usuário com o Assistente IA."""

    __tablename__ = "conversas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    titulo: Mapped[str] = mapped_column(String(300), default="Nova conversa", nullable=False)
    is_favorita: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    usuario: Mapped["User"] = relationship(back_populates="conversas")
    mensagens: Mapped[List["Mensagem"]] = relationship(
        back_populates="conversa", cascade="all, delete-orphan", order_by="Mensagem.id"
    )


class Mensagem(Base, TimestampMixin):
    """Representa uma mensagem individual dentro de uma conversa."""

    __tablename__ = "mensagens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversa_id: Mapped[int] = mapped_column(ForeignKey("conversas.id"), index=True, nullable=False)
    tipo: Mapped[TipoMensagem] = mapped_column(Enum(TipoMensagem), nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    fontes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    precisa_revisao: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    conversa: Mapped["Conversa"] = relationship(back_populates="mensagens")
