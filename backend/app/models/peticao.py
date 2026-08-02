"""Modelo de petição (PETICOES)."""

from __future__ import annotations

import enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class TipoPeticao(str, enum.Enum):
    """Tipos de petições e documentos jurídicos gerados."""

    INICIAL = "inicial"
    CONTESTACAO = "contestacao"
    AGRAVO = "agravo"
    APELACAO = "apelacao"
    MANDADO_SEGURANCA = "mandado_de_seguranca"
    CONTRATO = "contrato"
    PROCURACAO = "procuracao"
    PARECER = "parecer"
    PERSONALIZADO = "personalizado"


class Peticao(Base, TimestampMixin):
    """Representa uma petição ou documento jurídico gerado/editado."""

    __tablename__ = "peticoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    titulo: Mapped[str] = mapped_column(String(300), nullable=False)
    tipo: Mapped[TipoPeticao] = mapped_column(Enum(TipoPeticao), default=TipoPeticao.PERSONALIZADO, nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, default="", nullable=False)
    processo_numero: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tribunal: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    partes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    usuario: Mapped["User"] = relationship(back_populates="peticoes")
