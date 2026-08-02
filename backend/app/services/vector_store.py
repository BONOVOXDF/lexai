"""
Banco vetorial (Qdrant ou ChromaDB) para a arquitetura RAG.

O armazenamento é segmentado por usuário (payload `user_id`) para garantir
isolamento de dados entre escritórios. Apenas embeddings e metadados são
persistidos — nunca o conteúdo bruto dos documentos.
"""

import logging
import uuid
from typing import Any, Dict, List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class VectorStore:
    """Abstração sobre Qdrant e ChromaDB para operações de busca semântica."""

    def __init__(self) -> None:
        self._client = None
        self._backend = settings.VECTOR_STORE.lower()
        self._ready = False

    async def initialize(self) -> None:
        """Conecta ao backend de banco vetorial e garante a coleção existente."""
        if self._ready:
            return
        try:
            if self._backend == "qdrant":
                await self._init_qdrant()
            elif self._backend == "chroma":
                await self._init_chroma()
            else:
                logger.warning("Backend vetorial '%s' desconhecido. Desabilitando RAG.", self._backend)
            self._ready = True
        except Exception as exc:
            logger.warning("Banco vetorial indisponível (%s). RAG desabilitado.", exc)
            self._ready = False

    async def _init_qdrant(self) -> None:
        from qdrant_client import AsyncQdrantClient
        from qdrant_client.http.models import Distance, VectorParams

        if settings.QDRANT_LOCAL or not settings.QDRANT_URL:
            self._client = AsyncQdrantClient(path=settings.QDRANT_PATH)
            logger.info("Qdrant em modo local (path=%s).", settings.QDRANT_PATH)
        else:
            api_key = settings.QDRANT_API_KEY or None
            self._client = AsyncQdrantClient(url=settings.QDRANT_URL, api_key=api_key)
            logger.info("Qdrant em modo servidor (%s).", settings.QDRANT_URL)

        collections = await self._client.get_collections()
        names = {c.name for c in collections.collections}
        if settings.QDRANT_COLLECTION not in names:
            await self._client.create_collection(
                collection_name=settings.QDRANT_COLLECTION,
                vectors_config=VectorParams(size=settings.EMBEDDING_DIMENSION, distance=Distance.COSINE),
            )
        logger.info("Qdrant inicializado (%s).", settings.QDRANT_COLLECTION)

    async def _init_chroma(self) -> None:
        # ChromaDB (client persistente, interface síncrona) — usado em dev.
        import chromadb

        self._client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        self._chroma_collection = self._client.get_or_create_collection(
            name=settings.QDRANT_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("ChromaDB inicializado (%s).", settings.QDRANT_COLLECTION)

    @property
    def is_ready(self) -> bool:
        return self._ready

    async def upsert(
        self,
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: List[Dict[str, Any]],
    ) -> int:
        """Insere ou atualiza vetores na coleção. Retorna a quantidade inserida."""
        if not self.is_ready:
            return 0

        ids = [str(uuid.uuid4()) for _ in range(len(embeddings))]
        try:
            if self._backend == "qdrant":
                from qdrant_client.http.models import PointStruct

                points = [
                    PointStruct(id=id_, vector=vec, payload={"text": text, **meta})
                    for id_, vec, text, meta in zip(ids, embeddings, documents, metadatas)
                ]
                await self._client.upsert(collection_name=settings.QDRANT_COLLECTION, points=points)
            elif self._backend == "chroma":
                self._chroma_collection.add(
                    ids=ids,
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=metadatas,
                )
            return len(ids)
        except Exception as exc:
            logger.error("Falha ao inserir vetores: %s", exc)
            return 0

    async def search(
        self,
        query_embedding: List[float],
        user_id: int,
        limit: int = 6,
        score_threshold: float = 0.3,
    ) -> List[Dict[str, Any]]:
        """Busca semântica restrita ao usuário. Retorna trechos e metadados."""
        if not self.is_ready:
            return []

        try:
            if self._backend == "qdrant":
                from qdrant_client.http.models import Filter, FieldCondition, MatchValue

                result = await self._client.query_points(
                    collection_name=settings.QDRANT_COLLECTION,
                    query=query_embedding,
                    query_filter=Filter(
                        must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
                    ),
                    limit=limit,
                    score_threshold=score_threshold,
                )
                hits = []
                for point in result.points:
                    payload = point.payload or {}
                    hits.append(
                        {
                            "text": payload.get("text", ""),
                            "score": point.score,
                            "tipo": payload.get("tipo", "documento"),
                            "fonte": payload.get("fonte", "Documento"),
                            "url": payload.get("url"),
                            "data": payload.get("data"),
                        }
                    )
                return hits
            elif self._backend == "chroma":
                result = self._chroma_collection.query(
                    query_embeddings=[query_embedding],
                    n_results=limit,
                    where={"user_id": user_id},
                )
                hits = []
                for i, text in enumerate(result["documents"][0]):
                    meta = result["metadatas"][0][i] or {}
                    hits.append(
                        {
                            "text": text,
                            "score": result["distances"][0][i],
                            "tipo": meta.get("tipo", "documento"),
                            "fonte": meta.get("fonte", "Documento"),
                            "url": meta.get("url"),
                            "data": meta.get("data"),
                        }
                    )
                return hits
        except Exception as exc:
            logger.error("Falha na busca vetorial: %s", exc)
            return []

        return []

    async def delete_by_fonte(self, user_id: int, fonte_id: int) -> None:
        """Remove vetores vinculados a um documento do usuário (LGPD)."""
        if not self.is_ready:
            return
        try:
            if self._backend == "qdrant":
                from qdrant_client.http.models import Filter, FieldCondition, MatchValue

                await self._client.delete(
                    collection_name=settings.QDRANT_COLLECTION,
                    points_selector=Filter(
                        must=[
                            FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                            FieldCondition(key="fonte_id", match=MatchValue(value=fonte_id)),
                        ]
                    ),
                )
            elif self._backend == "chroma":
                self._chroma_collection.delete(where={"fonte_id": fonte_id, "user_id": user_id})
        except Exception as exc:
            logger.error("Falha ao remover vetores: %s", exc)

    async def close(self) -> None:
        """Encerra conexões com o banco vetorial."""
        if self._client is not None and self._backend == "qdrant":
            try:
                await self._client.close()
            except Exception:
                pass


vector_store = VectorStore()
