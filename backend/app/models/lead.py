"""Modelo de lead capturado no site (marketing)."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class Lead(Base, TimestampMixin):
    """Representa um visitante que cedeu o contato (lead magnet)."""

    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    telefone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    origem: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    kit_baixado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
