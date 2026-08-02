"""
Migra os dados do banco SQLite de desenvolvimento para o PostgreSQL.

Uso:
    cd backend
    $env:DATABASE_URL="postgresql+asyncpg://..."   # ou edite backend/.env
    python scripts/migrate_to_postgres.py

O script:
    1. Cria as tabelas no PostgreSQL (se ainda não existirem).
    2. Copia os dados preservando os IDs (FKs continuam válidas).
    3. Ajusta as sequences dos IDs no PostgreSQL.
"""

import asyncio
import datetime as dt
import logging
import os
import sys

sys.path.insert(0, ".")

from sqlalchemy import text

from app.database.base import Base
from app.database.session import engine, async_session_factory as async_session
from sqlalchemy.ext.asyncio import create_async_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SQLITE_URL = os.getenv("SQLITE_URL", "sqlite+aiosqlite:///./lexai_dev.db")

# Ordem de cópia respeitando as dependências (FK).
TABELAS = ["users", "clientes", "processos", "documentos", "conversas", "mensagens", "peticoes", "financeiro", "agenda"]


def converter_tipos(colunas: list, registro: dict) -> dict:
    """Converte tipos do SQLite (int para bool, str para datetime/date) para o PostgreSQL."""
    novo = {}
    for c in colunas:
        valor = registro[c]
        if isinstance(valor, int) and valor in (0, 1):
            novo[c] = bool(valor)
        elif isinstance(valor, str) and " " in valor and "-" in valor:
            try:
                novo[c] = dt.datetime.fromisoformat(valor)
            except ValueError:
                novo[c] = valor
        elif isinstance(valor, str) and len(valor) == 10 and "-" in valor:
            try:
                novo[c] = dt.date.fromisoformat(valor)
            except ValueError:
                novo[c] = valor
        else:
            novo[c] = valor
    return novo


async def criar_tabelas_postgres() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Tabelas criadas/verificadas no PostgreSQL.")


async def copiar_tabela(nome: str) -> int:
    src = create_async_engine(SQLITE_URL)
    linhas = 0
    try:
        async with src.connect() as conn:
            resultado = await conn.execute(text(f'SELECT * FROM "{nome}"'))
            colunas = list(resultado.keys())
            registros = [
                converter_tipos(colunas, dict(zip(colunas, row)))
                for row in resultado.fetchall()
            ]

        if not registros:
            logger.info("  %s: 0 linhas (vazio)", nome)
            return 0

        async with async_session() as db:
            async with db.begin():
                await db.execute(
                    text(
                        f'INSERT INTO "{nome}" ({", ".join(f'"{c}"' for c in colunas)}) VALUES '
                        f'({", ".join(":" + c for c in colunas)})'
                    ),
                    registros,
                )
        linhas = len(registros)
        logger.info("  %s: %d linhas copiadas", nome, linhas)
        return linhas
    finally:
        await src.dispose()


async def resetar_sequences() -> None:
    async with engine.begin() as conn:
        for nome in TABELAS:
            max_id = (await conn.execute(text(f'SELECT COALESCE(MAX(id), 0) FROM "{nome}"'))).scalar()
            if max_id:
                await conn.execute(
                    text(f"SELECT setval(pg_get_serial_sequence('{nome}', 'id'), :max)").bindparams(max=max_id)
                )
    logger.info("Sequences ajustadas.")


async def main() -> None:
    await criar_tabelas_postgres()
    total = 0
    for nome in TABELAS:
        total += await copiar_tabela(nome)
    await resetar_sequences()
    logger.info("Migração concluída: %d registros.", total)


if __name__ == "__main__":
    asyncio.run(main())
