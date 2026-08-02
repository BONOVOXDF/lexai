"""Modelo de movimentação financeira (FINANCEIRO)."""

from __future__ import annotations

import enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.user import User


class TipoMovimento(str, enum.Enum):
    """Classificação de receitas e despesas."""

    RECEITA = "receita"
    DESPESA = "despesa"


class CategoriaMovimento(str, enum.Enum):
    """Categorias financeiras utilizadas nos relatórios."""

    HONORARIOS = "honorarios"
    MENSALIDADE = "mensalidade"
    REEMBOLSO = "reembolso"
    DESPESA_OPERACIONAL = "despesa_operacional"
    CUSTAS = "custas"
    IMPOSTOS = "impostos"
    OUTROS = "outros"


class MovimentoFinanceiro(Base, TimestampMixin):
    """Representa uma entrada ou saída financeira do escritório."""

    __tablename__ = "financeiro"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    cliente_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clientes.id"), index=True, nullable=True)
    tipo: Mapped[TipoMovimento] = mapped_column(Enum(TipoMovimento), nullable=False)
    categoria: Mapped[CategoriaMovimento] = mapped_column(
        Enum(CategoriaMovimento), default=CategoriaMovimento.OUTROS, nullable=False
    )
    descricao: Mapped[str] = mapped_column(String(500), nullable=False)
    valor: Mapped[float] = mapped_column(Float, nullable=False)
    data: Mapped[Date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="pago", nullable=False)
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    usuario: Mapped["User"] = relationship()
    cliente: Mapped[Optional["Cliente"]] = relationship()
