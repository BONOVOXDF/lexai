"""
Alerta diário de prazos por e-mail.

Todos os dias às 07h (horário de Brasília), o serviço consulta processos com
prazo vencendo hoje ou nos próximos 2 dias e eventos da agenda (audiências,
prazos, reuniões, compromissos) do mesmo período, e envia um e-mail resumido
para cada usuário que tenha algo relevante.
"""

import logging
from datetime import date, datetime, timedelta
from typing import List
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.agenda import EventoAgenda
from app.models.processo import Processo
from app.models.user import User
from app.services import email_service

logger = logging.getLogger(__name__)

FUSO_BR = ZoneInfo("America/Sao_Paulo")

HORARIO_ALERTA = (7, 0)
JANELA_DIAS = 2
TIPO_EVENTO_LABEL = {
    "audiencia": "Audiência",
    "prazo": "Prazo",
    "reuniao": "Reunião",
    "compromisso": "Compromisso",
    "outro": "Evento",
}


def dia_br() -> date:
    """Data atual no fuso de Brasília."""
    return datetime.now(FUSO_BR).date()


async def coletar_prazos(
    db: AsyncSession, dia: date
) -> tuple[List[Processo], List[EventoAgenda]]:
    """Busca processos e eventos com prazo no período de interesse."""
    fim = dia + timedelta(days=JANELA_DIAS)

    processos_rows = await db.execute(
        select(Processo).where(
            Processo.prazo.is_not(None),
            Processo.prazo >= dia,
            Processo.prazo <= fim,
        )
    )
    processos = list(processos_rows.scalars().all())

    eventos_rows = await db.execute(
        select(EventoAgenda).where(
            EventoAgenda.data_inicio >= dia,
            EventoAgenda.data_inicio <= fim,
            EventoAgenda.concluido.is_(False),
        )
    )
    eventos = list(eventos_rows.scalars().all())
    return processos, eventos


def _formatar_data(dia: date) -> str:
    hoje = dia_br()
    if dia == hoje:
        return "hoje"
    if dia == hoje + timedelta(days=1):
        return "amanhã"
    if dia == hoje + timedelta(days=2):
        return "depois de amanhã"
    return dia.strftime("%d/%m/%Y")


def montar_html(*, nome: str, hoje: date, processos: List[Processo], eventos: List[EventoAgenda]) -> str:
    """Monta o e-mail em HTML com os prazos e compromissos do período."""
    itens: List[str] = []

    for evento in sorted(eventos, key=lambda e: (e.data_inicio, e.hora_inicio or "")):
        label = TIPO_EVENTO_LABEL.get(str(evento.tipo.value) if hasattr(evento.tipo, "value") else str(evento.tipo), "Evento")
        hora = f" às {evento.hora_inicio}" if evento.hora_inicio else ""
        local = f" — {evento.local}" if evento.local else ""
        itens.append(
            f'<li><strong>{label}: {evento.titulo}</strong><br>'
            f'<span style="color:#6b7280">{_formatar_data(evento.data_inicio)}{hora}{local}</span></li>'
        )

    for processo in sorted(processos, key=lambda p: p.prazo or date.max):
        if processo.prazo is None:
            continue
        tribunal = f" · {processo.tribunal}" if processo.tribunal else ""
        itens.append(
            f'<li><strong>Prazo processual: {processo.numero}</strong>{tribunal}<br>'
            f'<span style="color:#6b7280">Vence {_formatar_data(processo.prazo)}</span></li>'
        )

    lista = "".join(itens) if itens else "<li>Nenhum prazo para os próximos dias.</li>"
    hoje_str = hoje.strftime("%d/%m/%Y")

    return f"""
<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f2ec;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e1d5">
    <div style="background:#0e1a32;padding:24px 32px">
      <h1 style="margin:0;color:#d8b45a;font-size:20px">LEX AI — Agenda de hoje ({hoje_str})</h1>
      <p style="margin:6px 0 0;color:#aab4c8;font-size:14px">Resumo dos seus prazos e compromissos dos próximos dias.</p>
    </div>
    <div style="padding:24px 32px">
      <p style="margin:0 0 12px;color:#0e1a32;font-size:14px">Olá, <strong>{nome}</strong>! Confira o que está programado:</p>
      <ul style="margin:0;padding:0;list-style:none">{lista}</ul>
      <p style="margin:20px 0 0;font-size:14px">
        <a href="{settings.APP_URL}/dashboard" style="display:inline-block;background:#0e1a32;color:#d8b45a;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">Abrir painel</a>
      </p>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px">
        LEX AI — A Inteligência Artificial do Advogado.
      </p>
    </div>
  </div>
</div>
"""


def montar_texto(processos: List[Processo], eventos: List[EventoAgenda]) -> str:
    """Versão em texto puro do resumo (fallback de acessibilidade)."""
    linhas: List[str] = []
    for evento in sorted(eventos, key=lambda e: (e.data_inicio, e.hora_inicio or "")):
        hora = f" às {evento.hora_inicio}" if evento.hora_inicio else ""
        linhas.append(f"- {evento.titulo} — {_formatar_data(evento.data_inicio)}{hora}")
    for processo in sorted(processos, key=lambda p: p.prazo or date.max):
        if processo.prazo is not None:
            linhas.append(f"- Prazo: {processo.numero} — vence {_formatar_data(processo.prazo)}")
    return "\n".join(linhas) or "Nenhum prazo para os próximos dias."


async def enviar_alerta_diario(db: AsyncSession) -> int:
    """Envia o alerta diário de prazos. Retorna a quantidade de e-mails enviados."""
    if not settings.RESEND_API_KEY:
        logger.info("RESEND_API_KEY não configurada — alerta diário desativado.")
        return 0

    hoje = dia_br()
    processos, eventos = await coletar_prazos(db, hoje)
    if not processos and not eventos:
        logger.info("Alerta diário: nenhum prazo/compromisso; nenhum e-mail enviado.")
        return 0

    por_usuario: dict[int, dict] = {}
    for p in processos:
        por_usuario.setdefault(p.user_id, {"processos": [], "eventos": []})["processos"].append(p)
    for e in eventos:
        por_usuario.setdefault(e.user_id, {"processos": [], "eventos": []})["eventos"].append(e)

    users_rows = await db.execute(select(User).where(User.id.in_(list(por_usuario.keys()))))
    users = {u.id: u for u in users_rows.scalars().all()}

    enviados = 0
    for user_id, dados in por_usuario.items():
        usuario = users.get(user_id)
        if not usuario or not usuario.email:
            continue
        total = len(dados["processos"]) + len(dados["eventos"])
        assunto = f"LEX AI — {total} item(ns) de prazo para os próximos dias"
        ok = email_service.send_email(
            to=usuario.email,
            subject=assunto,
            html=montar_html(
                nome=usuario.nome,
                hoje=hoje,
                processos=dados["processos"],
                eventos=dados["eventos"],
            ),
            text=montar_texto(dados["processos"], dados["eventos"]),
        )
        if ok:
            enviados += 1

    logger.info("Alerta diário: %d e-mail(s) enviado(s).", enviados)
    return enviados
