"""
Serviço RAG (Retrieval-Augmented Generation).

Fluxo:
1. Pergunta do usuário.
2. Gera embedding da pergunta.
3. Busca contexto no banco vetorial (segmentado por usuário).
4. Monta prompt com fontes e chama a OpenAI.
5. Retorna resposta fundamentada + fontes utilizadas.
"""

import json
import logging
from typing import Any, Dict, List

from app.services.ai_service import ai_available, chat_completion, generate_embeddings
from app.services.vector_store import vector_store

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_BASE = """Você é o Assistente LEX AI, um assistente jurídico de apoio para advogados brasileiros.

Regras obrigatórias:
- Responda em português do Brasil, de forma técnica, organizada e objetiva.
- Formate a resposta em Markdown (títulos, listas, negrito).
- Quando houver contexto recuperado (abaixo de "CONTEXTO"), utilize-o como principal fonte de informação.
- Cite as fontes utilizadas no final da resposta, na seção "📚 Fontes:".
- IMPORTANTE: Você NÃO substitui um advogado. Sempre que a resposta envolver interpretação jurídica,
  orientação processual ou risco legal, inclua a nota: "⚠️ Esta resposta é um apoio preliminar e não
  substitui a análise de um advogado. Valide antes de qualquer ato processual."
- Se não houver contexto suficiente, indique claramente e sugira que o usuário envie documentos para análise.
"""

PETICAO_SYSTEM_PROMPT = """Você é um redator jurídico especialista da plataforma LEX AI.

Tarefa: redigir uma {tipo_peticao_display} completa e formal, no formato adequado ao direito brasileiro,
considerando o contexto fornecido pelo advogado.

Estrutura esperada:
1. Cabeçalho: Endereçamento ao juízo competente (informar tribunal/órgão quando fornecido).
2. Qualificação das partes (autor/réu, com nome e dados quando fornecidos).
3. Número do processo quando informado.
4. Exposição dos fatos.
5. Fundamentos jurídicos (cite a legislação aplicável de forma genérica quando não especificada).
6. Pedidos.
7. Fechamento padrão (termos em que pede deferimento, data e local).

Regras:
- Use linguagem formal, técnica e jurídica brasileira.
- Não invente dados processuais que não foram fornecidos; indique campos a preencher com colchetes [ ].
- Sempre adicione a nota: "⚠️ Documento gerado por IA — revisão obrigatória por advogado antes da distribuição."
"""

RESUMO_SYSTEM_PROMPT = """Você é um assistente jurídico da plataforma LEX AI.

Tarefa: produzir um resumo objetivo (máximo 300 palavras) do texto fornecido, destacando:
- Identificação das partes quando presente;
- Objeto do documento;
- Pedidos/pretensões;
- Datas e prazos relevantes;
- Pontos que exigem atenção do advogado.

Use Markdown para organizar o resumo."""


def _format_context(chunks: List[Dict[str, Any]]) -> str:
    """Formata os trechos recuperados para inclusão no prompt."""
    if not chunks:
        return "(nenhum contexto recuperado)"
    lines = []
    for i, chunk in enumerate(chunks, start=1):
        fonte = chunk.get("fonte", "Documento")
        lines.append(f"[Fonte {i} - {fonte}]\n{chunk.get('text', '')}")
    return "\n\n".join(lines)


def _build_sources(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Normaliza as fontes para resposta à API."""
    return [
        {
            "fonte": c.get("fonte", "Documento"),
            "tipo": c.get("tipo", "documento"),
            "trecho": c.get("text", "")[:200],
            "score": round(float(c.get("score", 0)), 3),
            "url": c.get("url"),
            "data": c.get("data"),
        }
        for c in chunks
    ]


async def answer_question(
    question: str,
    user_id: int,
    history: List[Dict[str, str]] | None = None,
) -> Dict[str, Any]:
    """
    Executa o fluxo RAG completo e retorna a resposta com fontes.

    Retorna dict com: resposta, fontes, precisa_revisao, usou_rag.
    """
    result = {
        "resposta": "",
        "fontes": [],
        "precisa_revisao": True,
        "usou_rag": False,
    }

    if not ai_available():
        result["resposta"] = (
            "⚠️ A inteligência artificial ainda não foi configurada. "
            "Adicione sua chave de IA no arquivo `.env` (OPENAI_API_KEY) para ativar o Assistente LEX AI."
        )
        return result

    # 1) Gera embedding da pergunta.
    query_embedding = (await generate_embeddings([question]))[0] if vector_store.is_ready else []

    # 2) Busca contexto no banco vetorial (base global + documentos do usuário).
    chunks: List[Dict[str, Any]] = []
    if query_embedding:
        chunks = await vector_store.search(query_embedding=query_embedding, user_id=user_id, limit=8)

    context = _format_context(chunks)
    system_prompt = (
        SYSTEM_PROMPT_BASE + "\n\n---\nCONTEXTO RECUPERADO:\n" + context + "\n---"
    )

    # 3) Chama o modelo de chat.
    resposta = await chat_completion(system_prompt=system_prompt, user_message=question, history=history)

    return {
        "resposta": resposta,
        "fontes": _build_sources(chunks),
        "precisa_revisao": True,
        "usou_rag": bool(chunks),
    }


async def gerar_peticao(tipo_peticao: str, contexto: str, **campos) -> str:
    """
    Gera o conteúdo de uma petição com base no tipo e contexto informados.
    """
    tipo_display = tipo_peticao.replace("_", " ").title()

    detalhes = []
    if campos.get("processo_numero"):
        detalhes.append(f"Processo: {campos['processo_numero']}")
    if campos.get("tribunal"):
        detalhes.append(f"Tribunal/Órgão: {campos['tribunal']}")
    if campos.get("cliente_nome"):
        detalhes.append(f"Cliente: {campos['cliente_nome']}")
    if campos.get("cliente_documento"):
        detalhes.append(f"Documento do cliente: {campos['cliente_documento']}")
    if campos.get("partes"):
        detalhes.append(f"Partes: {campos['partes']}")

    bloco = "\n".join(detalhes) if detalhes else "(sem dados adicionais fornecidos)"
    user_prompt = (
        f"Tipo de peça: {tipo_display}\n\n"
        f"Dados fornecidos:\n{bloco}\n\n"
        f"Contexto / instruções do advogado:\n{contexto}"
    )

    system_prompt = PETICAO_SYSTEM_PROMPT.format(tipo_peticao_display=tipo_display)
    return await chat_completion(system_prompt=system_prompt, user_message=user_prompt, temperature=0.2, max_tokens=3000)


async def resumir_documento(texto: str) -> str:
    """Produz um resumo automático do texto de um documento."""
    return await chat_completion(
        system_prompt=RESUMO_SYSTEM_PROMPT,
        user_message=f"Texto do documento:\n\n{texto[:12000]}",
        temperature=0.2,
        max_tokens=800,
    )


async def indexar_documento(
    user_id: int,
    documento_id: int,
    texto: str,
    fonte_nome: str,
    tipo: str = "documento",
    url: str | None = None,
    data: str | None = None,
) -> Dict[str, Any]:
    """
    Indexa um documento no banco vetorial (chunking + embeddings + upsert).

    Retorna dict com status da indexação.
    """
    if not vector_store.is_ready:
        return {"indexado": False, "chunks": 0, "motivo": "vector_store_indisponivel"}

    chunks = _split_text(texto)
    if not chunks:
        return {"indexado": False, "chunks": 0, "motivo": "texto_vazio"}

    metadatas = [
        {
            "user_id": user_id,
            "fonte_id": documento_id,
            "fonte": fonte_nome,
            "tipo": tipo,
            "url": url,
            "data": data,
        }
        for _ in chunks
    ]

    embeddings = await generate_embeddings(chunks)
    # Remove vetores falhos.
    valid = [(e, c, m) for e, c, m in zip(embeddings, chunks, metadatas) if e]
    if not valid:
        return {"indexado": False, "chunks": 0, "motivo": "embedding_falhou"}

    inserted = await vector_store.upsert(
        embeddings=[v[0] for v in valid],
        documents=[v[1] for v in valid],
        metadatas=[v[2] for v in valid],
    )
    return {"indexado": True, "chunks": inserted}


def _split_text(texto: str, chunk_size: int = 1000, overlap: int = 150) -> List[str]:
    """
    Divide o texto em blocos com sobreposição para indexação vetorial.

    Usa langchain-text-splitters quando disponível; caso contrário,
    utiliza um divisor simples baseado em parágrafos e sentenças.
    """
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        return splitter.split_text(texto)
    except ImportError:
        return _split_text_simples(texto, chunk_size, overlap)


def _split_text_simples(texto: str, chunk_size: int, overlap: int) -> List[str]:
    """Divisor simples de texto baseado em parágrafos/sentenças."""
    texto = texto.replace("\r\n", "\n").replace("\r", "\n")
    # Divide em parágrafos; parágrafos longos são quebrados em sentenças.
    blocos: List[str] = []
    for paragrafo in texto.split("\n\n"):
        paragrafo = paragrafo.strip()
        if not paragrafo:
            continue
        if len(paragrafo) > chunk_size:
            blocos.extend(s.strip() + "." for s in paragrafo.split(". ") if s.strip())
        else:
            blocos.append(paragrafo)

    chunks: List[str] = []
    atual = ""
    for bloco in blocos:
        if len(atual) + len(bloco) + 2 <= chunk_size:
            atual = f"{atual}\n\n{bloco}" if atual else bloco
        else:
            if atual:
                chunks.append(atual)
            atual = bloco
            # Bloco isolado ainda maior que o limite: corta à força.
            while len(atual) > chunk_size:
                chunks.append(atual[:chunk_size])
                atual = atual[chunk_size:]

    if atual:
        chunks.append(atual)

    # Aplica sobreposição entre chunks adjacentes.
    if overlap > 0 and len(chunks) > 1:
        final: List[str] = []
        for i, chunk in enumerate(chunks):
            if i > 0:
                prev_tail = final[-1][-overlap:]
                if prev_tail:
                    chunk = prev_tail + "\n" + chunk
            final.append(chunk)
        chunks = final

    return chunks


def serialize_sources(fontes: List[Dict[str, Any]]) -> str:
    """Serializa a lista de fontes para armazenamento textual na tabela de mensagens."""
    if not fontes:
        return ""
    try:
        return json.dumps(fontes, ensure_ascii=False)
    except (TypeError, ValueError):
        return ""
