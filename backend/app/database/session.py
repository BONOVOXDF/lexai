"""
Criação de sessão assíncrona e engine do SQLAlchemy.

A URL do banco é lida de `settings.DATABASE_URL`. Se o banco não estiver
disponível (ex.: desenvolvimento local sem Docker), podemos inicializar
com SQLite para permitir execução imediata.
"""

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.database.base import Base
from app.database.migracao import garantir_colunas_novas

logger = logging.getLogger(__name__)

_database_url = settings.DATABASE_URL

# Fallback para SQLite quando PostgreSQL não está disponível.
if _database_url.startswith("postgresql"):
    try:
        make_url(_database_url)
        engine = create_async_engine(_database_url, pool_pre_ping=True)
    except Exception:
        logger.warning("Falha ao configurar PostgreSQL, usando SQLite como fallback.")
        _database_url = "sqlite+aiosqlite:///./lexai.db"
        engine = create_async_engine(_database_url)
else:
    engine = create_async_engine(_database_url)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db() -> None:
    """Cria as tabelas no banco de dados e aplica migrações leves."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await garantir_colunas_novas(conn)
    logger.info("Tabelas do banco de dados criadas/verificadas.")


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Gerador de sessão usado pela aplicação (FastAPI dependency)."""
    async with async_session_factory() as session:
        yield session


async def dispose_engine() -> None:
    """Fecha o engine ao encerrar a aplicação."""
    await engine.dispose()
