"""
Rotas de conversas do Assistente IA: CRUD, favoritos, histórico
e envio de perguntas com resposta via RAG.
"""

import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_db
from app.models.conversa import Conversa, Mensagem, TipoMensagem
from app.models.user import User
from app.schemas.common import MessageResponse, Paginated
from app.schemas.conversa import (
    ConversaCreate,
    ConversaDetail,
    ConversaOut,
    ConversaUpdate,
    MensagemAIResult,
    MensagemCreate,
    MensagemOut,
)
from app.services.export_service import export_pdf
from app.services.rag_service import answer_question, serialize_sources

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conversas", tags=["Assistente IA"])


async def _get_owned_conversa(conversa_id: int, user: User, db: AsyncSession) -> Conversa:
    """Recupera uma conversa garantindo que pertença ao usuário."""
    result = await db.execute(
        select(Conversa).where(Conversa.id == conversa_id, Conversa.user_id == user.id)
    )
    conversa = result.scalar_one_or_none()
    if conversa is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversa não encontrada.")
    return conversa


@router.get("", response_model=Paginated[ConversaOut])
async def list_conversas(
    favoritas: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Paginated[ConversaOut]:
    """Lista conversas do usuário, opcionalmente apenas as favoritas."""
    filters = [Conversa.user_id == user.id]
    if favoritas:
        filters.append(Conversa.is_favorita.is_(True))

    total = await db.scalar(select(func.count()).select_from(Conversa).where(*filters)) or 0
    result = await db.execute(
        select(Conversa).where(*filters).order_by(Conversa.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    items = result.scalars().all()
    return Paginated(
        items=[ConversaOut.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max((total + page_size - 1) // page_size, 1) if total else 0,
    )


@router.get("/{conversa_id}", response_model=ConversaDetail)
async def get_conversa(
    conversa_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Conversa:
    """Retorna uma conversa com todas as mensagens."""
    result = await db.execute(
        select(Conversa)
        .options(selectinload(Conversa.mensagens))
        .where(Conversa.id == conversa_id, Conversa.user_id == user.id)
    )
    conversa = result.scalar_one_or_none()
    if conversa is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversa não encontrada.")
    return conversa


@router.post("", response_model=ConversaOut, status_code=status.HTTP_201_CREATED)
async def create_conversa(
    payload: ConversaCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Conversa:
    """Cria uma nova conversa para o usuário."""
    conversa = Conversa(user_id=user.id, titulo=payload.titulo or "Nova conversa")
    db.add(conversa)
    await db.commit()
    await db.refresh(conversa)
    return conversa


@router.put("/{conversa_id}", response_model=ConversaOut)
async def update_conversa(
    conversa_id: int,
    payload: ConversaUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Conversa:
    """Atualiza título ou favorito de uma conversa."""
    conversa = await _get_owned_conversa(conversa_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(conversa, field, value)
    await db.commit()
    await db.refresh(conversa)
    return conversa


@router.delete("/{conversa_id}", response_model=MessageResponse)
async def delete_conversa(
    conversa_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Exclui uma conversa e suas mensagens."""
    conversa = await _get_owned_conversa(conversa_id, user, db)
    await db.delete(conversa)
    await db.commit()
    return MessageResponse(message="Conversa excluída com sucesso.")


@router.post("/{conversa_id}/mensagens", response_model=MensagemAIResult)
async def enviar_mensagem(
    conversa_id: int,
    payload: MensagemCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MensagemAIResult:
    """
    Envia uma pergunta para o Assistente IA e retorna a resposta fundamentada (RAG).

    O histórico da conversa é enviado ao modelo para manter o contexto.
    """
    conversa = await _get_owned_conversa(conversa_id, user, db)

    # 1) Salva a mensagem do usuário.
    mensagem_usuario = Mensagem(
        conversa_id=conversa.id,
        tipo=TipoMensagem.USUARIO,
        conteudo=payload.conteudo,
    )
    db.add(mensagem_usuario)
    await db.commit()

    # 2) Monta histórico recente (últimas 12 mensagens).
    result = await db.execute(
        select(Mensagem)
        .where(Mensagem.conversa_id == conversa.id)
        .order_by(Mensagem.id.desc())
        .limit(12)
    )
    historico_linhas = list(reversed(result.scalars().all()))
    history = [
        {"role": "user" if m.tipo == TipoMensagem.USUARIO else "assistant", "content": m.conteudo}
        for m in historico_linhas[:-1]
    ]

    # 3) Executa o fluxo RAG.
    resultado = await answer_question(payload.conteudo, user.id, history=history)

    # 4) Atualiza título automático da conversa se for nova.
    if len(historico_linhas) <= 1 and conversa.titulo == "Nova conversa":
        conversa.titulo = payload.conteudo[:60] + ("..." if len(payload.conteudo) > 60 else "")

    # 5) Salva a resposta do assistente.
    mensagem_ia = Mensagem(
        conversa_id=conversa.id,
        tipo=TipoMensagem.ASSISTENTE,
        conteudo=resultado["resposta"],
        fontes=serialize_sources(resultado["fontes"]),
        precisa_revisao=resultado["precisa_revisao"],
    )
    db.add(mensagem_ia)
    await db.commit()
    await db.refresh(mensagem_ia)

    return MensagemAIResult(mensagem=MensagemOut.model_validate(mensagem_ia), conversa_id=conversa.id)


@router.get("/{conversa_id}/export")
async def exportar_conversa(
    conversa_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Exporta a conversa em formato Markdown."""
    result = await db.execute(
        select(Conversa)
        .options(selectinload(Conversa.mensagens))
        .where(Conversa.id == conversa_id, Conversa.user_id == user.id)
    )
    conversa = result.scalar_one_or_none()
    if conversa is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversa não encontrada.")

    linhas = [f"# {conversa.titulo}", ""]
    for m in conversa.mensagens:
        autor = "**Você:**" if m.tipo == TipoMensagem.USUARIO else "**LEX AI:**"
        linhas.append(f"{autor}\n\n{m.conteudo}\n")
        if m.fontes:
            linhas.append(f"\n*Fontes: {m.fontes}*\n")

    markdown = "\n".join(linhas)
    return {"titulo": conversa.titulo, "markdown": markdown}


@router.get("/{conversa_id}/export-pdf")
async def exportar_conversa_pdf(
    conversa_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Exporta a conversa em formato PDF (perguntas e respostas)."""
    result = await db.execute(
        select(Conversa)
        .options(selectinload(Conversa.mensagens))
        .where(Conversa.id == conversa_id, Conversa.user_id == user.id)
    )
    conversa = result.scalar_one_or_none()
    if conversa is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversa não encontrada.")

    linhas = [f"# {conversa.titulo}", ""]
    for m in conversa.mensagens:
        autor = "**Você:**" if m.tipo == TipoMensagem.USUARIO else "**LEX AI:**"
        linhas.append(f"{autor}\n\n{m.conteudo}\n")
        if m.fontes:
            linhas.append(f"\n*Fontes: {m.fontes}*\n")

    conteudo = "\n".join(linhas)
    pdf = export_pdf(conversa.titulo, conteudo)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": _content_disposition(f"{conversa.titulo}.pdf")},
    )


@router.get("/{conversa_id}/mensagens/{mensagem_id}/export-pdf")
async def exportar_mensagem_pdf(
    conversa_id: int,
    mensagem_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Exporta uma única resposta (mensagem) em formato PDF."""
    await _get_owned_conversa(conversa_id, user, db)

    result = await db.execute(
        select(Mensagem).where(Mensagem.id == mensagem_id, Mensagem.conversa_id == conversa_id)
    )
    mensagem = result.scalar_one_or_none()
    if mensagem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mensagem não encontrada.")

    autor = "LEX AI" if mensagem.tipo == TipoMensagem.ASSISTENTE else "Você"
    titulo = f"{autor} - Resposta LEX AI"
    conteudo = mensagem.conteudo
    if mensagem.fontes:
        conteudo += f"\n\n*Fontes: {mensagem.fontes}*"

    pdf = export_pdf(titulo, conteudo)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": _content_disposition(f"resposta-lex-ai-{mensagem.id}.pdf")},
    )


def _content_disposition(filename: str) -> str:
    """Monta o header Content-Disposition com suporte a caracteres acentuados (RFC 5987)."""
    from urllib.parse import quote

    ascii_name = filename.encode("ascii", "ignore").decode("ascii") or "arquivo"
    return f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{quote(filename)}'
