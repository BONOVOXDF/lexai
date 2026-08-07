"""Indexa a base de conhecimento global da LEX AI no banco vetorial (user_id=0).

A base global é compartilhada por todos os usuários e enriquece o RAG com
conteúdo jurídico estruturado (guias, súmulas, modelos, prazos, legislação).

Uso (a partir de backend/):
    python scripts/index_base_global.py

Idempotente: remove os pontos anteriores de user_id=0 antes de reindexar.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, ".")

from qdrant_client import models as qm
from qdrant_client.http.models import PayloadSchemaType

from app.core.config import settings
from app.services.rag_service import indexar_documento
from app.services.vector_store import vector_store

BASE_DIR = Path(__file__).resolve().parents[1] / "data" / "conhecimento"

# Tipo e nome de fonte por arquivo (usado nas buscas e fontes do RAG).
ARQUIVOS = {
    "01-consumidor.md": {"tipo": "guia", "nome": "Base LEX AI — Direito do Consumidor"},
    "02-trabalhista.md": {"tipo": "guia", "nome": "Base LEX AI — Direito do Trabalho"},
    "03-civel-contratos.md": {"tipo": "guia", "nome": "Base LEX AI — Direito Cível e Contratos"},
    "04-empresarial.md": {"tipo": "guia", "nome": "Base LEX AI — Direito Empresarial"},
    "05-tributario.md": {"tipo": "guia", "nome": "Base LEX AI — Direito Tributário"},
    "06-previdenciario.md": {"tipo": "guia", "nome": "Base LEX AI — Direito Previdenciário"},
    "07-penal.md": {"tipo": "guia", "nome": "Base LEX AI — Direito Penal"},
    "08-lgpd.md": {"tipo": "guia", "nome": "Base LEX AI — LGPD e Proteção de Dados"},
    "09-prazos-processuais.md": {"tipo": "prazo", "nome": "Base LEX AI — Prazos Processuais"},
    "10-sumulas.md": {"tipo": "sumula", "nome": "Base LEX AI — Súmulas dos Tribunais Superiores"},
    "11-modelos-peticoes.md": {"tipo": "modelo", "nome": "Base LEX AI — Modelos de Petições"},
    "12-escritorio.md": {"tipo": "guia", "nome": "Base LEX AI — Prática Jurídica e Escritório"},
}

USER_ID_GLOBAL = 0


async def main() -> None:
    await vector_store.initialize()
    if not vector_store.is_ready:
        print("Vector store indisponível. Abortando.")
        return

    # Garante índices de payload para filtros.
    for campo in ("user_id", "fonte_id"):
        try:
            await vector_store._client.create_payload_index(
                collection_name=settings.QDRANT_COLLECTION,
                field_name=campo,
                field_schema=PayloadSchemaType.INTEGER,
            )
        except Exception as exc:
            print(f"  índice payload '{campo}': {exc}")

    # Remove indexação anterior da base global.
    await vector_store._client.delete(
        collection_name=settings.QDRANT_COLLECTION,
        points_selector=qm.Filter(
            must=[qm.FieldCondition(key="user_id", match=qm.MatchValue(value=USER_ID_GLOBAL))]
        ),
    )
    print("Indexação anterior da base global removida.")

    total = 0
    for nome, meta in sorted(ARQUIVOS.items()):
        caminho = BASE_DIR / nome
        if not caminho.exists():
            print(f"  {nome}: arquivo não encontrado, pulado")
            continue
        texto = caminho.read_text(encoding="utf-8").strip()
        if not texto:
            print(f"  {nome}: vazio, pulado")
            continue

        fonte_id = int(nome.split("-", 1)[0])
        r = await indexar_documento(
            USER_ID_GLOBAL,
            fonte_id,
            texto,
            meta["nome"],
            tipo=meta["tipo"],
        )
        print(f"  {nome}: {r}")
        total += r.get("chunks", 0)

    print("TOTAL chunks da base global:", total)
    await vector_store.close()


asyncio.run(main())
