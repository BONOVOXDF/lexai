"""
Rotas de atas: CRUD, geração via IA e exportação Word/PDF.

- POST /api/atas/gerar: gera uma ata estruturada via IA a partir das notas.
- GET /api/atas: lista atas do usuário com filtros.
- POST /api/atas: registro manual.
- GET/PUT/DELETE /api/atas/{ata_id}: detalhe, edição e exclusão.
- GET/POST /api/atas/{ata_id}/export: exporta em Word ou PDF.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.ata import Ata
from app.models.processo import Processo
from app.models.user import User
from app.schemas.ata import AtaCreate, AtaGenerateRequest, AtaOut, AtaUpdate
from app.schemas.common import MessageResponse, Paginated
from app.services.export_service import export_docx, export_pdf
from app.services.rag_service import gerar_ata
from app.services.rate_limit import check_ia_quota

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/atas", tags=["Atas"])


async def _get_owned_ata(ata_id: int, user: User, db: AsyncSession) -> Ata:
    result = await db.execute(select(Ata).where(Ata.id == ata_id, Ata.user_id == user.id))
    ata = result.scalar_one_or_none()
    if ata is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ata não encontrada.")
    return ata


async def _validar_processo(
    db: AsyncSession, user: User, processo_id: Optional[int]
) -> None:
    """Garante que o processo vinculado pertence ao usuário."""
    if processo_id is None:
        return
    processo = await db.scalar(
        select(Processo).where(Processo.id == processo_id, Processo.user_id == user.id)
    )
    if processo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Processo não encontrado.")


@router.get("", response_model=Paginated[AtaOut])
async def listar_atas(
    tipo: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Paginated[AtaOut]:
    """Lista atas do usuário com filtros."""
    filters = [Ata.user_id == user.id]
    if tipo:
        filters.append(Ata.tipo == tipo)
    if q:
        like = f"%{q}%"
        filters.append(Ata.titulo.ilike(like))

    total = await db.scalar(select(func.count()).select_from(Ata).where(*filters)) or 0
    result = await db.execute(
        select(Ata)
        .where(*filters)
        .order_by(Ata.data_evento.desc().nulls_last(), Ata.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = result.scalars().all()
    return Paginated(
        items=[AtaOut.model_validate(a) for a in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max((total + page_size - 1) // page_size, 1) if total else 0,
    )


@router.get("/{ata_id}", response_model=AtaOut)
async def get_ata(
    ata_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Ata:
    """Retorna uma ata específica do usuário."""
    return await _get_owned_ata(ata_id, user, db)


@router.post("", response_model=AtaOut, status_code=status.HTTP_201_CREATED)
async def criar_ata(
    payload: AtaCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Ata:
    """Registra uma ata manualmente."""
    await _validar_processo(db, user, payload.processo_id)
    ata = Ata(user_id=user.id, **payload.model_dump())
    db.add(ata)
    await db.commit()
    await db.refresh(ata)
    return ata


@router.post("/gerar", response_model=AtaOut, status_code=status.HTTP_201_CREATED)
async def gerar_ata_ia(
    payload: AtaGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Ata:
    """Gera uma ata via IA a partir das notas do advogado e a salva."""
    await check_ia_quota(user)
    await _validar_processo(db, user, payload.processo_id)

    conteudo = await gerar_ata(
        titulo=payload.titulo,
        tipo_ata=payload.tipo.value,
        notas=payload.notas,
        data_evento=payload.data_evento,
        local=payload.local,
        participantes=payload.participantes,
        processo_numero=payload.processo_numero,
    )

    ata = Ata(
        user_id=user.id,
        titulo=payload.titulo,
        tipo=payload.tipo,
        data_evento=payload.data_evento,
        local=payload.local,
        participantes=payload.participantes,
        processo_id=payload.processo_id,
        processo_numero=payload.processo_numero,
        conteudo=conteudo,
    )
    db.add(ata)
    await db.commit()
    await db.refresh(ata)
    return ata


@router.put("/{ata_id}", response_model=AtaOut)
async def atualizar_ata(
    ata_id: int,
    payload: AtaUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Ata:
    """Atualiza uma ata (edição antes da exportação)."""
    ata = await _get_owned_ata(ata_id, user, db)
    dados = payload.model_dump(exclude_unset=True)
    if "processo_id" in dados:
        await _validar_processo(db, user, dados["processo_id"])
    for campo, valor in dados.items():
        setattr(ata, campo, valor)
    await db.commit()
    await db.refresh(ata)
    return ata


@router.delete("/{ata_id}", response_model=MessageResponse)
async def excluir_ata(
    ata_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Exclui uma ata do usuário."""
    ata = await _get_owned_ata(ata_id, user, db)
    await db.delete(ata)
    await db.commit()
    return MessageResponse(message="Ata excluída com sucesso.")


@router.get("/{ata_id}/export")
@router.post("/{ata_id}/export")
async def exportar_ata(
    ata_id: int,
    formato: str = Query(default="word", pattern="^(word|pdf)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Exporta a ata em formato Word (.docx) ou PDF."""
    ata = await _get_owned_ata(ata_id, user, db)

    if formato == "word":
        conteudo = export_docx(ata.titulo, ata.conteudo)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        filename = f"{ata.titulo}.docx"
    else:
        conteudo = export_pdf(ata.titulo, ata.conteudo)
        media_type = "application/pdf"
        filename = f"{ata.titulo}.pdf"

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
