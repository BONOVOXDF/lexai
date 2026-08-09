"""Agrega todos os modelos para o Alembic e para o Base.metadata."""

from app.database.base import Base

# Importa os modelos para registro no metadata (ordem importa).
from app.models.agenda import EventoAgenda
from app.models.assinatura import Assinatura
from app.models.ata import Ata
from app.models.cliente import Cliente
from app.models.conversa import Conversa, Mensagem
from app.models.documento import Documento
from app.models.financeiro import MovimentoFinanceiro
from app.models.intimacao import Intimacao
from app.models.lead import Lead
from app.models.peticao import Peticao
from app.models.portal_acesso import PortalAcesso
from app.models.processo import Processo
from app.models.user import User

__all__ = [
    "Base",
    "User",
    "Cliente",
    "Processo",
    "Documento",
    "Conversa",
    "Mensagem",
    "Peticao",
    "EventoAgenda",
    "MovimentoFinanceiro",
    "Lead",
    "Assinatura",
    "PortalAcesso",
    "Intimacao",
    "Ata",
]
