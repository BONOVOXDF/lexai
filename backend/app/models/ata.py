"""Modelo de ata (ATAS): registro de audiências, reuniões e deliberações."""

from __future__ import annotations

import enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class TipoAta(str, enum.Enum):
    """Tipos de ata suportados pela plataforma."""

    REUNIAO = "reuniao"
    AUDIENCIA = "audiencia"
    CONCILIACAO = "conciliacao"
    INTERNA = "interna"
    CLIENTE = "cliente"


class Ata(Base, TimestampMixin):
    """Representa uma ata de reunião/audiência gerada ou registrada."""

    __tablename__ = "atas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    processo_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("processos.id"), index=True, nullable=True
    )
    titulo: Mapped[str] = mapped_column(String(300), nullable=False)
    tipo: Mapped[TipoAta] = mapped_column(Enum(TipoAta), default=TipoAta.REUNIAO, nullable=False)
    data_evento: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    local: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    participantes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processo_numero: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    conteudo: Mapped[str] = mapped_column(Text, default="", nullable=False)
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    usuario: Mapped["User"] = relationship(back_populates="atas")
