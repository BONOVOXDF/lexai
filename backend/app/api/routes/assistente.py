"""
Rotas do Assistente IA: pergunta direta e upload de arquivos para análise.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.conversa import MensagemAIResult, MensagemCreate, MensagemOut
from app.services.document_service import extract_text, map_tipo, save_upload, validate_upload
from app.services.rag_service import answer_question, indexar_documento, serialize_sources
from app.services.rate_limit import check_ia_quota
from app.models.conversa import Conversa, Mensagem, TipoMensagem
from app.models.documento import Documento

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assistente", tags=["Assistente IA"])


@router.post("/perguntar", response_model=dict)
async def perguntar(
    payload: MensagemCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Responde uma pergunta direta ao Assistente IA usando RAG,
    sem necessariamente criar uma conversa persistida.
    """
    await check_ia_quota(user)
    resultado = await answer_question(payload.conteudo, user.id)
    return {
        "resposta": resultado["resposta"],
        "fontes": resultado["fontes"],
        "precisa_revisao": resultado["precisa_revisao"],
        "usou_rag": resultado["usou_rag"],
    }


@router.post("/analisar-arquivo", response_model=dict)
async def analisar_arquivo(
    file: UploadFile = File(...),
    pergunta: str = Form(default="Resuma e identifique os pontos principais deste documento."),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Envia um arquivo (PDF, DOCX, imagem) para o assistente analisar.

    O texto é extraído, indexado no vetor do usuário e a IA responde
    à pergunta com base no conteúdo do arquivo.
    """
    await check_ia_quota(user)
    ext = validate_upload(file)
    caminho, mime_type, tamanho = await save_upload(file, ext)
    texto = await extract_text(caminho, ext)

    if not texto.strip():
        return {"resposta": "Não foi possível extrair texto do arquivo enviado.", "fontes": [], "precisa_revisao": True}

    documento = Documento(
        user_id=user.id,
        nome_original=file.filename or "arquivo",
        caminho_arquivo=caminho,
        tipo=map_tipo(ext),
        tamanho_bytes=tamanho,
        mime_type=mime_type,
        conteudo_texto=texto,
        status="pronto",
    )
    db.add(documento)
    await db.commit()
    await db.refresh(documento)

    resultado_index = await indexar_documento(
        user_id=user.id,
        documento_id=documento.id,
        texto=texto,
        fonte_nome=documento.nome_original,
        tipo=documento.tipo.value,
    )
    documento.is_indexed = bool(resultado_index.get("indexado"))
    await db.commit()

    contexto_prompt = (
        f"O usuário enviou o documento '{documento.nome_original}'. "
        f"Conteúdo extraído:\n\n{texto[:14000]}\n\nPergunta do usuário: {pergunta}"
    )
    resultado = await answer_question(contexto_prompt, user.id)
    return resultado
