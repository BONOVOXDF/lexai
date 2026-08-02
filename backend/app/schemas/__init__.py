"""Exportação de schemas Pydantic."""

from app.schemas.agenda import (
    EventoCreate,
    EventoOut,
    EventoUpdate,
)
from app.schemas.cliente import (
    ClienteCreate,
    ClienteOut,
    ClienteUpdate,
)
from app.schemas.common import MessageResponse, Paginated
from app.schemas.conversa import (
    ConversaCreate,
    ConversaDetail,
    ConversaOut,
    ConversaUpdate,
    MensagemAIResult,
    MensagemCreate,
    MensagemOut,
)
from app.schemas.dashboard import (
    AtividadeRecente,
    DashboardData,
    DashboardStats,
    PontoGrafico,
)
from app.schemas.documento import (
    DocumentoOut,
    DocumentoPesquisaResult,
    DocumentoResumoOut,
    DocumentoUpdate,
)
from app.schemas.financeiro import (
    MovimentoCreate,
    MovimentoOut,
    MovimentoUpdate,
    ResumoFinanceiro,
)
from app.schemas.pesquisa import (
    PesquisaRequest,
    ResultadoPesquisa,
    ResultadoPesquisaIA,
)
from app.schemas.peticao import (
    PeticaoCreate,
    PeticaoGenerateRequest,
    PeticaoOut,
    PeticaoUpdate,
)
from app.schemas.processo import (
    ProcessoCreate,
    ProcessoOut,
    ProcessoUpdate,
)
from app.schemas.settings import SettingsUpdate
from app.schemas.user import (
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserOut,
    UserUpdate,
    UserUpdatePassword,
)

__all__ = [
    "EventoCreate",
    "EventoOut",
    "EventoUpdate",
    "ClienteCreate",
    "ClienteOut",
    "ClienteUpdate",
    "MessageResponse",
    "Paginated",
    "ConversaCreate",
    "ConversaDetail",
    "ConversaOut",
    "ConversaUpdate",
    "MensagemAIResult",
    "MensagemCreate",
    "MensagemOut",
    "AtividadeRecente",
    "DashboardData",
    "DashboardStats",
    "PontoGrafico",
    "DocumentoOut",
    "DocumentoPesquisaResult",
    "DocumentoResumoOut",
    "DocumentoUpdate",
    "MovimentoCreate",
    "MovimentoOut",
    "MovimentoUpdate",
    "ResumoFinanceiro",
    "PesquisaRequest",
    "ResultadoPesquisa",
    "ResultadoPesquisaIA",
    "PeticaoCreate",
    "PeticaoGenerateRequest",
    "PeticaoOut",
    "PeticaoUpdate",
    "ProcessoCreate",
    "ProcessoOut",
    "ProcessoUpdate",
    "SettingsUpdate",
    "ForgotPasswordRequest",
    "GoogleAuthRequest",
    "LoginRequest",
    "RefreshRequest",
    "ResetPasswordRequest",
    "TokenResponse",
    "UserCreate",
    "UserOut",
    "UserUpdate",
    "UserUpdatePassword",
]
