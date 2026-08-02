"""Serviços da aplicação LEX AI."""

from app.services.ai_service import chat_completion, generate_embeddings
from app.services.rag_service import answer_question, gerar_peticao, indexar_documento, resumir_documento
from app.services.vector_store import vector_store

__all__ = [
    "chat_completion",
    "generate_embeddings",
    "answer_question",
    "gerar_peticao",
    "indexar_documento",
    "resumir_documento",
    "vector_store",
]
