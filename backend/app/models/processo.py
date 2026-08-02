"""Modelo de processo judicial (PROCESSOS)."""

from __future__ import annotations

import enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.documento import Documento
    from app.models.user import User


class StatusProcesso(str, enum.Enum):
    """Status possíveis de um processo judicial."""

    EM_ANDAMENTO = "em_andamento"
    ARQUIVADO = "arquivado"
    SUSPENSO = "suspenso"
    CONCLUIDO = "concluido"
    DISTRIBUIDO = "distribuido"


class Processo(Base, TimestampMixin):
    """Representa um processo judicial acompanhado pelo escritório."""

    __tablename__ = "processos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    cliente_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clientes.id"), index=True, nullable=True)
    numero: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    tribunal: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    classe: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    vara: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    comarca: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    advogado: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[StatusProcesso] = mapped_column(
        Enum(StatusProcesso), default=StatusProcesso.EM_ANDAMENTO, nullable=False
    )
    prazo: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    valor_causa: Mapped[Optional[float]] = mapped_column(nullable=True)

    usuario: Mapped["User"] = relationship(back_populates="processos")
    cliente: Mapped[Optional["Cliente"]] = relationship(back_populates="processos")
    documentos: Mapped[List["Documento"]] = relationship(
        back_populates="processo", cascade="all, delete-orphan"
    )
