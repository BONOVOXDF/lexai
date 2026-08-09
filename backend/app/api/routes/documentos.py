"""
Rotas de documentos: upload, listagem, download, resumo automático,
pesquisa textual e exclusão (com remoção do índice vetorial - LGPD).
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.cliente import Cliente
from app.models.documento import Documento
from app.models.user import User
from app.schemas.common import MessageResponse, Paginated
from app.schemas.documento import (
    DocumentoGeradoOut,
    DocumentoGeradoRequest,
    DocumentoOut,
    DocumentoPesquisaResult,
    DocumentoResumoOut,
    DocumentoUpdate,
)
from app.services import gerador_documentos
from app.services.document_service import (
    delete_file,
    extract_text,
    map_tipo,
    save_upload,
    validate_upload,
)
from app.services.rag_service import indexar_documento, resumir_documento
from app.services.vector_store import vector_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documentos", tags=["Documentos"])


async def _get_owned_documento(documento_id: int, user: User, db: AsyncSession) -> Documento:
    """Recupera um documento garantindo que pertença ao usuário."""
    result = await db.execute(
        select(Documento).where(Documento.id == documento_id, Documento.user_id == user.id)
    )
    documento = result.scalar_one_or_none()
    if documento is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento não encontrado.")
    return documento


@router.get("", response_model=Paginated[DocumentoOut])
async def list_documentos(
    q: str | None = Query(default=None),
    processo_id: Optional[int] = None,
    cliente_id: Optional[int] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Paginated[DocumentoOut]:
    """Lista documentos do usuário com filtros e paginação."""
    filters = [Documento.user_id == user.id]
    if q:
        like = f"%{q}%"
        filters.append(Documento.nome_original.ilike(like))
    if processo_id:
        filters.append(Documento.processo_id == processo_id)
    if cliente_id:
        filters.append(Documento.cliente_id == cliente_id)

    total = await db.scalar(select(func.count()).select_from(Documento).where(*filters)) or 0
    result = await db.execute(
        select(Documento).where(*filters).order_by(Documento.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    items = result.scalars().all()
    return Paginated(
        items=[DocumentoOut.model_validate(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max((total + page_size - 1) // page_size, 1) if total else 0,
    )


@router.post("/upload", response_model=DocumentoOut, status_code=status.HTTP_201_CREATED)
async def upload_documento(
    file: UploadFile = File(...),
    processo_id: int | None = Form(default=None),
    cliente_id: int | None = Form(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Documento:
    """
    Faz upload de um documento, extrai o texto e indexa no banco vetorial.

    Se a IA não estiver configurada, o documento é armazenado e marcado
    como pendente de processamento.
    """
    ext = validate_upload(file)
    caminho, mime_type, tamanho = await save_upload(file, ext)

    documento = Documento(
        user_id=user.id,
        processo_id=processo_id,
        cliente_id=cliente_id,
        nome_original=file.filename or "documento",
        caminho_arquivo=caminho,
        tipo=map_tipo(ext),
        tamanho_bytes=tamanho,
        mime_type=mime_type,
        status="processando",
    )
    db.add(documento)
    await db.commit()
    await db.refresh(documento)

    # Extração de texto + indexação (tolerante a falhas).
    texto = await extract_text(caminho, ext)
    documento.conteudo_texto = texto
    documento.status = "pronto"

    if texto.strip():
        resultado = await indexar_documento(
            user_id=user.id,
            documento_id=documento.id,
            texto=texto,
            fonte_nome=documento.nome_original,
            tipo=documento.tipo.value,
        )
        documento.is_indexed = bool(resultado.get("indexado"))

    await db.commit()
    await db.refresh(documento)
    return documento


@router.post("/{documento_id}/resumo", response_model=DocumentoResumoOut)
async def resumir_documento_endpoint(
    documento_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentoResumoOut:
    """Gera um resumo automático do conteúdo do documento via IA."""
    documento = await _get_owned_documento(documento_id, user, db)
    if not documento.conteudo_texto:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Documento sem conteúdo extraído para resumo.")

    documento.resumo = await resumir_documento(documento.conteudo_texto)
    await db.commit()
    return DocumentoResumoOut(id=documento.id, resumo=documento.resumo or "")


@router.get("/{documento_id}/download")
async def download_documento(
    documento_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    """Faz o download do arquivo original do documento."""
    documento = await _get_owned_documento(documento_id, user, db)
    return FileResponse(
        documento.caminho_arquivo,
        filename=documento.nome_original,
        media_type=documento.mime_type or "application/octet-stream",
    )


@router.put("/{documento_id}", response_model=DocumentoOut)
async def update_documento(
    documento_id: int,
    payload: DocumentoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Documento:
    """Atualiza metadados de um documento."""
    documento = await _get_owned_documento(documento_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(documento, field, value)
    await db.commit()
    await db.refresh(documento)
    return documento


@router.delete("/{documento_id}", response_model=MessageResponse)
async def delete_documento(
    documento_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Exclui um documento, removendo arquivo e vetores indexados (LGPD)."""
    documento = await _get_owned_documento(documento_id, user, db)
    await vector_store.delete_by_fonte(user.id, documento.id)
    delete_file(documento.caminho_arquivo)
    await db.delete(documento)
    await db.commit()
    return MessageResponse(message="Documento excluído com sucesso.")


@router.get("/pesquisa/textual", response_model=List[DocumentoPesquisaResult])
async def pesquisar_documentos(
    termo: str = Query(..., min_length=2),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[DocumentoPesquisaResult]:
    """Pesquisa textual simples no conteúdo extraído dos documentos."""
    like = f"%{termo}%"
    result = await db.execute(
        select(Documento).where(Documento.user_id == user.id, Documento.conteudo_texto.ilike(like)).limit(20)
    )
    docs = result.scalars().all()

    resultados = []
    for doc in docs:
        texto = doc.conteudo_texto or ""
        idx = texto.lower().find(termo.lower())
        if idx >= 0:
            trecho = texto[max(0, idx - 120): idx + len(termo) + 240].replace("\n", " ")
        else:
            trecho = texto[:240]
        resultados.append(
            DocumentoPesquisaResult(
                id=doc.id,
                nome_original=doc.nome_original,
                trecho=trecho,
                score=1.0,
            )
        )
    return resultados


@router.get("/modelos")
async def listar_modelos(
    user: User = Depends(get_current_user),
) -> dict:
    """Lista os modelos de documentos disponíveis para geração."""
    return {"modelos": gerador_documentos.listar_modelos()}


@router.post("/gerar", response_model=DocumentoGeradoOut)
async def gerar_documento(
    payload: DocumentoGeradoRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentoGeradoOut:
    """Gera um documento preenchido com os dados do cliente e do advogado."""
    result = await db.execute(
        select(Cliente).where(Cliente.id == payload.cliente_id, Cliente.user_id == user.id)
    )
    cliente = result.scalar_one_or_none()
    if cliente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")

    try:
        gerado = gerador_documentos.gerar_documento_texto(cliente, user, payload.modelo)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return DocumentoGeradoOut(**gerado)


@router.post("/gerar/export")
async def exportar_documento(
    payload: DocumentoGeradoRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    """Gera e exporta o documento preenchido em formato .docx."""
    result = await db.execute(
        select(Cliente).where(Cliente.id == payload.cliente_id, Cliente.user_id == user.id)
    )
    cliente = result.scalar_one_or_none()
    if cliente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")

    try:
        conteudo_bytes = gerador_documentos.gerar_documento_docx(cliente, user, payload.modelo)
        nome_arquivo = f"{payload.modelo.replace(' ', '_')}_{cliente.nome}.docx"
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    from fastapi.responses import Response

    return Response(
        content=conteudo_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{nome_arquivo}"'},
    )
