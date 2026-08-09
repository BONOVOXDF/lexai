"""
Portal do cliente: convite por e-mail, criação de senha, login e consulta
dos próprios processos e eventos (apenas os do cliente logado).
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Tuple

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_db
from app.core.config import settings
from app.core.security import (
    create_portal_access_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.cliente import Cliente
from app.models.portal_acesso import PortalAcesso
from app.models.processo import Processo
from app.models.agenda import EventoAgenda, TipoEvento
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.portal import (
    PortalAceitarConviteRequest,
    PortalDashboardOut,
    PortalEventoOut,
    PortalLoginOut,
    PortalLoginRequest,
    PortalProcessoOut,
)
from app.services.email_service import send_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portal", tags=["Portal do Cliente"])

CONVITE_VALIDADE_DIAS = 7


def _novo_token_convite() -> str:
    return secrets.token_urlsafe(48)


def _email_convite(nome_cliente: str, nome_advogado: str, link: str) -> tuple[str, str]:
    html = (
        f"<p>Olá, <strong>{nome_cliente}</strong>!</p>"
        f"<p>O escritório de <strong>{nome_advogado}</strong> liberou seu acesso ao "
        f"portal do cliente no LEX AI.</p>"
        f"<p>Por lá você acompanha seus processos, prazos e audiências.</p>"
        f"<p><a href='{link}' style='display:inline-block;padding:12px 24px;"
        f"background:#a5762c;color:#fff;text-decoration:none;border-radius:8px;'>"
        f"Ativar meu acesso</a></p>"
        f"<p>O link é válido por <strong>{CONVITE_VALIDADE_DIAS} dias</strong>. "
        f"Se não reconhece esta solicitação, ignore este e-mail.</p>"
    )
    texto = f"Ative seu acesso ao portal do cliente: {link}"
    return html, texto


async def _get_portal(
    authorization: str | None, db: AsyncSession
) -> Tuple[Cliente, User]:
    """Valida o token do portal e retorna (cliente, advogado)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais não fornecidas.")
    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_token(token, expected_type="access")
    if not payload or payload.get("tipo_conta") != "portal":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado.")

    try:
        cliente_id = int(payload["sub"])
        advogado_id = int(payload["advogado_id"])
    except (KeyError, ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.")

    result = await db.execute(
        select(Cliente)
        .options(selectinload(Cliente.portal_acesso))
        .where(Cliente.id == cliente_id, Cliente.user_id == advogado_id)
    )
    cliente = result.scalar_one_or_none()
    if cliente is None or cliente.portal_acesso is None or not cliente.portal_acesso.ativo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Acesso não habilitado.")

    advogado_result = await db.execute(select(User).where(User.id == advogado_id))
    advogado = advogado_result.scalar_one_or_none()
    if advogado is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Conta do escritório não encontrada.")

    return cliente, advogado


def _processo_out(processo: Processo) -> PortalProcessoOut:
    return PortalProcessoOut(
        id=processo.id,
        numero=processo.numero,
        tribunal=processo.tribunal,
        classe=processo.classe,
        vara=processo.vara,
        comarca=processo.comarca,
        status=processo.status,
        prazo=processo.prazo,
        observacoes=processo.observacoes,
        created_at=processo.created_at,
    )


def _evento_out(evento: EventoAgenda) -> PortalEventoOut:
    return PortalEventoOut(
        id=evento.id,
        titulo=evento.titulo,
        tipo=evento.tipo.value,
        descricao=evento.descricao,
        data_inicio=evento.data_inicio,
        hora_inicio=evento.hora_inicio,
        data_fim=evento.data_fim,
        hora_fim=evento.hora_fim,
        local=evento.local,
        concluido=evento.concluido,
        processo_id=evento.processo_id,
    )


@router.post("/clientes/{cliente_id}/convite", response_model=MessageResponse)
async def convidar_cliente(
    cliente_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Envia convite por e-mail para o cliente acessar o portal."""
    result = await db.execute(
        select(Cliente).where(Cliente.id == cliente_id, Cliente.user_id == user.id)
    )
    cliente = result.scalar_one_or_none()
    if cliente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")
    if not cliente.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O cliente precisa de um e-mail cadastrado para receber o convite.",
        )

    acesso = await db.scalar(
        select(PortalAcesso).where(PortalAcesso.cliente_id == cliente.id)
    )
    if acesso is None:
        acesso = PortalAcesso(cliente_id=cliente.id, advogado_user_id=user.id)
        db.add(acesso)

    acesso.convite_token = _novo_token_convite()
    acesso.convite_expira = datetime.now(timezone.utc) + timedelta(days=CONVITE_VALIDADE_DIAS)
    if acesso.senha_hash:
        acesso.ativo = True  # reenvio para quem já ativou: apenas reenvia o link
    await db.commit()

    link = f"{settings.APP_URL}/portal/aceitar?token={acesso.convite_token}"
    html, texto = _email_convite(cliente.nome, user.nome, link)
    enviado = send_email(
        to=cliente.email,
        subject="Seu acesso ao portal do cliente — LEX AI",
        html=html,
        text=texto,
    )
    if not enviado:
        logger.warning("Convite do portal (não enviado): %s", link)

    return MessageResponse(message="Convite enviado ao cliente.")


@router.post("/aceitar", response_model=MessageResponse)
async def aceitar_convite(
    payload: PortalAceitarConviteRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Cria a senha do cliente a partir do token do convite."""
    if payload.senha != payload.confirmar_senha:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="As senhas não coincidem.")
    if len(payload.senha) < 6:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A senha deve ter ao menos 6 caracteres.")

    agora = datetime.now(timezone.utc)
    acesso = await db.scalar(
        select(PortalAcesso).where(PortalAcesso.convite_token == payload.token)
    )
    if acesso is None or acesso.convite_expira is None or acesso.convite_expira < agora:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Convite inválido ou expirado.")

    acesso.senha_hash = hash_password(payload.senha)
    acesso.ativo = True
    acesso.convite_token = None
    acesso.convite_expira = None
    await db.commit()

    return MessageResponse(message="Acesso ativado. Faça login no portal.")


@router.post("/login", response_model=PortalLoginOut)
async def login_portal(
    payload: PortalLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> PortalLoginOut:
    """Autentica o cliente no portal por e-mail e senha."""
    result = await db.execute(
        select(Cliente)
        .options(selectinload(Cliente.portal_acesso))
        .where(Cliente.email == payload.email.lower())
    )
    cliente = result.scalar_one_or_none()
    if (
        cliente is None
        or cliente.portal_acesso is None
        or not cliente.portal_acesso.ativo
        or not cliente.portal_acesso.senha_hash
        or not verify_password(payload.senha, cliente.portal_acesso.senha_hash)
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha incorretos.")

    token = create_portal_access_token(cliente.id, cliente.user_id)
    return PortalLoginOut(
        access_token=token,
        cliente={
            "id": cliente.id,
            "nome": cliente.nome,
            "email": cliente.email,
        },
    )


@router.get("/dashboard", response_model=PortalDashboardOut)
async def portal_dashboard(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> PortalDashboardOut:
    """Visão geral do cliente: processos, prazos próximos e próximas audiências."""
    cliente, _ = await _get_portal(authorization, db)

    processos_result = await db.execute(
        select(Processo)
        .where(Processo.user_id == cliente.user_id, Processo.cliente_id == cliente.id)
        .order_by(Processo.prazo.asc().nulls_last())
    )
    processos = processos_result.scalars().all()

    eventos_result = await db.execute(
        select(EventoAgenda)
        .where(
            EventoAgenda.user_id == cliente.user_id,
            EventoAgenda.cliente_id == cliente.id,
            EventoAgenda.data_inicio >= datetime.now(timezone.utc).date(),
        )
        .order_by(EventoAgenda.data_inicio.asc())
    )
    eventos = eventos_result.scalars().all()

    prazos_proximos = sum(1 for p in processos if p.prazo and p.prazo >= datetime.now(timezone.utc).date())
    audiencias = [e for e in eventos if e.tipo == TipoEvento.AUDIENCIA and not e.concluido]

    return PortalDashboardOut(
        cliente={"id": cliente.id, "nome": cliente.nome, "email": cliente.email},
        processos=[_processo_out(p) for p in processos],
        eventos=[_evento_out(e) for e in eventos],
        total_processos=len(processos),
        total_prazos_proximos=prazos_proximos,
        proximas_audiencias=[_evento_out(e) for e in audiencias[:5]],
    )
