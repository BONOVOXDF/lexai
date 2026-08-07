"""
Configurações centralizadas da aplicação LEX AI.

Utiliza pydantic-settings para carregar variáveis de ambiente com
tipagem estrita e valores padrão seguros para desenvolvimento.
"""

from datetime import datetime, timezone
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações da aplicação, carregadas do ambiente (arquivo .env)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Aplicação ---
    APP_NAME: str = "LEX AI"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # --- Banco de dados ---
    DATABASE_URL: str = "postgresql+asyncpg://lexai:lexai@localhost:5432/lexai"

    # --- Redis ---
    REDIS_URL: str = "redis://localhost:6379/0"

    # --- Segurança ---
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 dias
    BCRYPT_ROUNDS: int = 12

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    # --- IA ---
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536
    AI_PROVIDER: str = "openai"

    # --- Banco Vetorial ---
    VECTOR_STORE: str = "qdrant"
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "lexai_documents"
    QDRANT_LOCAL: bool = False
    QDRANT_PATH: str = "./data/qdrant"
    CHROMA_PERSIST_DIR: str = "./data/chroma"

    # --- Supabase (opcional) ---
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""

    # --- Rate limit ---
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60

    # --- E-mail (Resend) ---
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "LEX AI <onboarding@resend.dev>"
    APP_URL: str = "http://localhost:3000"

    # --- Mercado Pago (pagamentos) ---
    MP_ACCESS_TOKEN: str = ""
    MP_PUBLIC_KEY: str = ""
    MP_WEBHOOK_SECRET: str = ""
    BACKEND_URL: str = "http://localhost:8000"
    PLANO_PRO_PRECO: float = 97.0
    PLANO_EMPRESA_PRECO: float = 297.0
    PLANO_DURACAO_DIAS: int = 30

    # --- Pré-venda (desconto de lançamento) ---
    PRE_VENDA_ATE: str = "2026-08-15T23:59:59-03:00"
    PLANO_PRO_PRECO_PRE_VENDA: float = 47.0
    PLANO_EMPRESA_PRECO_PRE_VENDA: float = 147.0

    @property
    def em_pre_venda(self) -> bool:
        """True enquanto a pré-venda estiver ativa (antes da data limite)."""
        try:
            fim = datetime.fromisoformat(self.PRE_VENDA_ATE)
        except (TypeError, ValueError):
            return False
        if fim.tzinfo is None:
            fim = fim.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) < fim

    @property
    def precos_por_plano(self) -> dict[str, float]:
        """Preço (R$) por plano assinável, aplicando o desconto de pré-venda quando ativo."""
        if self.em_pre_venda:
            return {
                "pro": self.PLANO_PRO_PRECO_PRE_VENDA,
                "empresa": self.PLANO_EMPRESA_PRECO_PRE_VENDA,
            }
        return {"pro": self.PLANO_PRO_PRECO, "empresa": self.PLANO_EMPRESA_PRECO}

    # --- Uploads ---
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_MB: int = 25
    ALLOWED_UPLOAD_EXTENSIONS: str = ".pdf,.docx,.png,.jpg,.jpeg,.tiff,.txt"

    @field_validator("CORS_ORIGINS")
    @classmethod
    def _split_cors_origins(cls, value: str) -> List[str]:
        """Converte a string de origens separadas por vírgula em uma lista."""
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    @property
    def cors_origins_list(self) -> List[str]:
        """Lista de origens permitidas para CORS."""
        return self.CORS_ORIGINS

    @property
    def allowed_extensions(self) -> List[str]:
        """Lista de extensões permitidas para upload de arquivos."""
        return [ext.strip().lower() for ext in self.ALLOWED_UPLOAD_EXTENSIONS.split(",") if ext.strip()]

    @property
    def max_upload_bytes(self) -> int:
        """Tamanho máximo de upload em bytes."""
        return self.MAX_UPLOAD_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Retorna a instância única (cacheada) de configurações."""
    return Settings()


settings = get_settings()
