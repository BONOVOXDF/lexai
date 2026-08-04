"""
Rotas de petições: CRUD, geração via IA e exportação Word/PDF.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.peticao import Peticao
from app.models.user import User
from app.schemas.common import MessageResponse, Paginated
from app.schemas.peticao import (
    PeticaoCreate,
    PeticaoGenerateRequest,
    PeticaoOut,
    PeticaoUpdate,
)
from app.services.export_service import export_docx, export_pdf
from app.services.rag_service import gerar_peticao
from app.services.rate_limit import check_ia_quota

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/peticoes", tags=["Petições"])


async def _get_owned_peticao(peticao_id: int, user: User, db: AsyncSession) -> Peticao:
    """Recupera uma petição garantindo que pertença ao usuário."""
    result = await db.execute(select(Peticao).where(Peticao.id == peticao_id, Peticao.user_id == user.id))
    peticao = result.scalar_one_or_none()
    if peticao is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Petição não encontrada.")
    return peticao


@router.get("", response_model=Paginated[PeticaoOut])
async def list_peticoes(
    tipo: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Paginated[PeticaoOut]:
    """Lista petições do usuário com filtros."""
    filters = [Peticao.user_id == user.id]
    if tipo:
        filters.append(Peticao.tipo == tipo)
    if q:
        like = f"%{q}%"
        filters.append(Peticao.titulo.ilike(like))

    total = await db.scalar(select(func.count()).select_from(Peticao).where(*filters)) or 0
    result = await db.execute(
        select(Peticao).where(*filters).order_by(Peticao.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    items = result.scalars().all()
    return Paginated(
        items=[PeticaoOut.model_validate(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max((total + page_size - 1) // page_size, 1) if total else 0,
    )


@router.get("/{peticao_id}", response_model=PeticaoOut)
async def get_peticao(
    peticao_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Peticao:
    """Retorna uma petição específica do usuário."""
    return await _get_owned_peticao(peticao_id, user, db)


@router.post("", response_model=PeticaoOut, status_code=status.HTTP_201_CREATED)
async def create_peticao(
    payload: PeticaoCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Peticao:
    """Cria uma petição manual (vazia ou com conteúdo)."""
    peticao = Peticao(user_id=user.id, **payload.model_dump())
    db.add(peticao)
    await db.commit()
    await db.refresh(peticao)
    return peticao


@router.put("/{peticao_id}", response_model=PeticaoOut)
async def update_peticao(
    peticao_id: int,
    payload: PeticaoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Peticao:
    """Atualiza o conteúdo de uma petição (edição antes da exportação)."""
    peticao = await _get_owned_peticao(peticao_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(peticao, field, value)
    await db.commit()
    await db.refresh(peticao)
    return peticao


@router.delete("/{peticao_id}", response_model=MessageResponse)
async def delete_peticao(
    peticao_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Exclui uma petição do usuário."""
    peticao = await _get_owned_peticao(peticao_id, user, db)
    await db.delete(peticao)
    await db.commit()
    return MessageResponse(message="Petição excluída com sucesso.")


@router.post("/gerar", response_model=PeticaoOut, status_code=status.HTTP_201_CREATED)
async def generate_peticao(
    payload: PeticaoGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Peticao:
    """
    Gera uma petição via IA e a salva para edição posterior.

    A petição gerada sempre requer revisão profissional antes do uso.
    """
    await check_ia_quota(user)
    conteudo = await gerar_peticao(
        tipo_peticao=payload.tipo.value,
        contexto=payload.contexto,
        processo_numero=payload.processo_numero,
        tribunal=payload.tribunal,
        cliente_nome=payload.cliente_nome,
        cliente_documento=payload.cliente_documento,
        partes=payload.partes,
    )

    peticao = Peticao(
        user_id=user.id,
        titulo=f"{payload.tipo.value.replace('_', ' ').title()} - {payload.contexto[:40]}"
        if payload.contexto
        else payload.tipo.value.replace("_", " ").title(),
        tipo=payload.tipo,
        conteudo=conteudo,
        processo_numero=payload.processo_numero,
        tribunal=payload.tribunal,
        partes=payload.partes,
    )
    db.add(peticao)
    await db.commit()
    await db.refresh(peticao)
    return peticao


@router.get("/{peticao_id}/export")
@router.post("/{peticao_id}/export")
async def export_peticao(
    peticao_id: int,
    formato: str = Query(default="word", pattern="^(word|pdf)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Exporta a petição em formato Word (.docx) ou PDF."""
    peticao = await _get_owned_peticao(peticao_id, user, db)

    if formato == "word":
        conteudo = export_docx(peticao.titulo, peticao.conteudo)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        filename = f"{peticao.titulo}.docx"
    else:
        conteudo = export_pdf(peticao.titulo, peticao.conteudo)
        media_type = "application/pdf"
        filename = f"{peticao.titulo}.pdf"

    return Response(
        content=conteudo,
        media_type=media_type,
        headers={"Content-Disposition": _content_disposition(filename)},
    )


def _content_disposition(filename: str) -> str:
    """Monta o header Content-Disposition com suporte a caracteres acentuados (RFC 5987)."""
    from urllib.parse import quote

    ascii_name = filename.encode("ascii", "ignore").decode("ascii") or "arquivo"
    return f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{quote(filename)}'
