"""
Migrações leves e idempotentes para bancos PostgreSQL existentes.

O `create_all` do SQLAlchemy não altera tabelas já criadas; colunas novas
adicionadas ao modelo são aplicadas aqui via `ALTER TABLE ... ADD COLUMN
IF NOT EXISTS`, executado no início do processo.
"""

import logging

from sqlalchemy import text

logger = logging.getLogger(__name__)

COLUNAS_POR_TABELA: dict[str, dict[str, str]] = {
    "users": {
        "trial_iniciado_em": "TIMESTAMP WITH TIME ZONE",
        "trial_usado": "BOOLEAN NOT NULL DEFAULT FALSE",
    },
}


async def garantir_colunas_novas(conn) -> None:
    """Aplica colunas faltantes em tabelas existentes (somente PostgreSQL)."""
    if conn.dialect.name != "postgresql":
        return
    for tabela, colunas in COLUNAS_POR_TABELA.items():
        for nome, tipo in colunas.items():
            try:
                await conn.execute(
                    text(f'ALTER TABLE "{tabela}" ADD COLUMN IF NOT EXISTS "{nome}" {tipo}')
                )
            except Exception as exc:  # pragma: no cover
                logger.warning("Não foi possível aplicar %s.%s: %s", tabela, nome, exc)
