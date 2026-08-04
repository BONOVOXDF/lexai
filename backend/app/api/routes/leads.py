"""
Rotas de captura de leads (marketing).

O POST é público (usado pelo formulário do site) e sujeito ao rate
limit global por IP. A listagem é restrita a administradores.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.lead import Lead
from app.models.user import User
from app.schemas.lead import LeadCreate, LeadKitRequest, LeadOut
from app.services.email_service import send_email
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.post("", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
async def capturar_lead(payload: LeadCreate, db: AsyncSession = Depends(get_db)) -> Lead:
    """
    Registra um lead capturado no site.

    Se o e-mail já foi capturado, retorna o lead existente (idempotente)
    sem criar duplicatas.
    """
    email = payload.email.lower()
    result = await db.execute(select(Lead).where(Lead.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    lead = Lead(
        nome=payload.nome.strip(),
        email=email,
        telefone=payload.telefone,
        origem=payload.origem,
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    if settings.RESEND_API_KEY:
        send_email(
            to=email,
            subject="Seu kit de modelos de petição — LEX AI",
            html=(
                f"<p>Olá, <strong>{lead.nome}</strong>!</p>"
                f"<p>Obrigado por baixar o kit. Acesse a página abaixo para baixar "
                f"os modelos de petição e comece a testar o LEX AI:</p>"
                f"<p><a href='{settings.APP_URL}/modelos-de-peticao'>Baixar kit</a></p>"
            ),
            text=f"Olá, {lead.nome}! Baixe os modelos em {settings.APP_URL}/modelos-de-peticao",
        )

    return lead


@router.post("/baixar-kit")
async def marcar_kit_baixado(payload: LeadKitRequest, db: AsyncSession = Depends(get_db)) -> dict:
    """Marca que o lead baixou o kit (uso analítico)."""
    result = await db.execute(select(Lead).where(Lead.email == payload.email.lower()))
    lead = result.scalar_one_or_none()
    if lead is not None and not lead.kit_baixado:
        lead.kit_baixado = True
        await db.commit()
    return {"ok": True}


@router.get("", response_model=List[LeadOut])
async def listar_leads(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[Lead]:
    """Lista os leads capturados (apenas administradores)."""
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem acessar os leads.",
        )

    result = await db.execute(select(Lead).order_by(Lead.created_at.desc()).limit(200))
    return list(result.scalars().all())
