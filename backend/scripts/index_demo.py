"""Indexa os dados demo do admin no banco vetorial (Qdrant) — idempotente."""

import asyncio
import sys

sys.path.insert(0, ".")

from sqlalchemy import select

from app.core.config import settings
from app.database.session import async_session_factory as async_session
from app.models.documento import Documento
from app.models.peticao import Peticao
from app.models.user import User
from app.services.rag_service import indexar_documento
from app.services.vector_store import vector_store

ADMIN_EMAIL = "admin@lexai.com"


async def main():
    await vector_store.initialize()
    if not vector_store.is_ready:
        print("Vector store indisponível. Abortando.")
        return

    async with async_session() as db:
        user = (await db.execute(select(User).where(User.email == ADMIN_EMAIL))).scalar_one_or_none()
        if user is None:
            print("Admin não encontrado.")
            return
        print(f"Admin: {user.email} (id={user.id})")

        # Remove indexação anterior do usuário para manter consistência.
        from qdrant_client import models as qm
        from qdrant_client.http.models import PayloadSchemaType

        for campo in ("user_id", "fonte_id"):
            try:
                await vector_store._client.create_payload_index(
                    collection_name=settings.QDRANT_COLLECTION,
                    field_name=campo,
                    field_schema=PayloadSchemaType.INTEGER,
                )
            except Exception as exc:
                print(f"  índice payload '{campo}': {exc}")

        await vector_store._client.delete(
            collection_name=settings.QDRANT_COLLECTION,
            points_selector=qm.Filter(
                must=[qm.FieldCondition(key="user_id", match=qm.MatchValue(value=user.id))]
            ),
        )
        print("Indexação anterior do usuário removida.")

        total = 0

        # Documentos
        docs = (await db.execute(select(Documento).where(Documento.user_id == user.id))).scalars().all()
        for d in docs:
            texto = "\n\n".join(part for part in (d.conteudo_texto, d.resumo) if part)
            if not texto.strip():
                print(f"  documento {d.nome_original}: sem texto, pulado")
                continue
            r = await indexar_documento(user.id, d.id, texto, d.nome_original, tipo="documento")
            print(f"  documento {d.nome_original}: {r}")
            total += r.get("chunks", 0)

        # Petições (conteúdo pesquisável)
        pets = (await db.execute(select(Peticao).where(Peticao.user_id == user.id))).scalars().all()
        for p in pets:
            if not p.conteudo or len(p.conteudo) < 50:
                print(f"  peticao {p.titulo}: sem conteudo, pulado")
                continue
            texto = f"{p.titulo}\n\n{p.conteudo}"
            r = await indexar_documento(user.id, p.id, texto, p.titulo, tipo="peticao")
            print(f"  peticao {p.titulo}: {r}")
            total += r.get("chunks", 0)

        print("TOTAL chunks indexados:", total)

    await vector_store.close()


asyncio.run(main())
