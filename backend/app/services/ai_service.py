"""
Serviço de Inteligência Artificial (OpenAI).

Encapsula as chamadas ao modelo de chat e de embeddings, com tratamento
de erros e fallback claro quando a API key não está configurada.
"""

import logging
from typing import List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

_openai_client = None


def get_openai_client():
    """Cria/retorna o cliente OpenAI (lazy singleton)."""
    global _openai_client
    if _openai_client is None and settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI

            kwargs = {"api_key": settings.OPENAI_API_KEY}
            if settings.OPENAI_BASE_URL:
                kwargs["base_url"] = settings.OPENAI_BASE_URL
            _openai_client = AsyncOpenAI(**kwargs)
        except ImportError:
            logger.error("Pacote 'openai' não instalado.")
    return _openai_client


def ai_available() -> bool:
    """Indica se a IA está configurada e disponível."""
    return get_openai_client() is not None


async def chat_completion(
    system_prompt: str,
    user_message: str,
    history: Optional[List[dict]] = None,
    temperature: float = 0.3,
    max_tokens: int = 2000,
) -> str:
    """
    Executa uma chamada de chat para o modelo configurado.

    Parâmetros:
        system_prompt: instruções de sistema que definem o papel da IA.
        user_message: mensagem principal do usuário.
        history: histórico de mensagens anteriores (tipo, conteúdo).
        temperature: criatividade da resposta (0 = determinístico).
        max_tokens: limite de tokens da resposta.

    Retorna o texto da resposta ou mensagem de erro amigável.
    """
    client = get_openai_client()
    if client is None:
        return (
            "⚠️ A inteligência artificial ainda não foi configurada. "
            "Adicione sua chave de IA no arquivo `.env` (OPENAI_API_KEY) para ativar o Assistente LEX AI."
        )

    messages: List[dict] = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""
    except Exception as exc:
        logger.error("Erro na chamada OpenAI: %s", exc)
        return (
            "⚠️ Ocorreu um erro ao processar sua solicitação na IA. "
            "Verifique a chave de IA configurada no arquivo `.env` e tente novamente."
        )


async def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Gera embeddings para uma lista de textos usando o modelo configurado.

    Retorna lista de vetores. Em caso de falha, retorna listas vazias.
    """
    client = get_openai_client()
    if client is None or not texts:
        return [[] for _ in texts]

    try:
        response = await client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=texts,
        )
        return [item.embedding for item in response.data]
    except Exception as exc:
        logger.error("Erro ao gerar embeddings: %s", exc)
        return [[] for _ in texts]
