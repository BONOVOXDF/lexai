"""Modelos da agenda: eventos e prazos (AGENDA)."""

from __future__ import annotations

import enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.processo import Processo
    from app.models.user import User


class TipoEvento(str, enum.Enum):
    """Classificação de um evento na agenda."""

    AUDIENCIA = "audiencia"
    COMPROMISSO = "compromisso"
    PRAZO = "prazo"
    REUNIAO = "reuniao"
    OUTRO = "outro"


class EventoAgenda(Base, TimestampMixin):
    """Representa um evento na agenda do advogado."""

    __tablename__ = "agenda"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    cliente_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clientes.id"), index=True, nullable=True)
    processo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("processos.id"), index=True, nullable=True)
    titulo: Mapped[str] = mapped_column(String(300), nullable=False)
    tipo: Mapped[TipoEvento] = mapped_column(Enum(TipoEvento), default=TipoEvento.OUTRO, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_inicio: Mapped[Date] = mapped_column(Date, nullable=False, index=True)
    hora_inicio: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    data_fim: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    hora_fim: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    local: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    notificar: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    concluido: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    usuario: Mapped["User"] = relationship()
    cliente: Mapped[Optional["Cliente"]] = relationship()
    processo: Mapped[Optional["Processo"]] = relationship()
