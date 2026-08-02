"""Modelo de documento (DOCUMENTOS)."""

from __future__ import annotations

import enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.cliente import Cliente
    from app.models.processo import Processo
    from app.models.user import User


class TipoDocumento(str, enum.Enum):
    """Tipos de arquivo suportados."""

    PDF = "pdf"
    DOCX = "docx"
    IMAGEM = "imagem"
    TEXTO = "texto"
    PPTX = "pptx"


class Documento(Base, TimestampMixin):
    """Representa um arquivo armazenado e processado pela plataforma."""

    __tablename__ = "documentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    processo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("processos.id"), index=True, nullable=True)
    cliente_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clientes.id"), index=True, nullable=True)
    nome_original: Mapped[str] = mapped_column(String(500), nullable=False)
    caminho_arquivo: Mapped[str] = mapped_column(String(1000), nullable=False)
    tipo: Mapped[TipoDocumento] = mapped_column(Enum(TipoDocumento), nullable=False)
    tamanho_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mime_type: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    conteudo_texto: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resumo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pronto", nullable=False)
    is_indexed: Mapped[bool] = mapped_column(default=False, nullable=False)

    usuario: Mapped["User"] = relationship(back_populates="documentos")
    processo: Mapped[Optional["Processo"]] = relationship(back_populates="documentos")
    cliente: Mapped[Optional["Cliente"]] = relationship(back_populates="documentos")
