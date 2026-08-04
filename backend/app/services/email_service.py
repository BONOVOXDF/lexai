"""
Serviço de envio de e-mails via Resend.

Degrada graciosamente quando RESEND_API_KEY não está configurada:
registra o conteúdo no log (útil em desenvolvimento) e retorna False.
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str, text: str = "") -> bool:
    """Envia um e-mail transacional via Resend. Retorna True em caso de sucesso."""
    api_key = settings.RESEND_API_KEY
    if not api_key:
        logger.warning(
            "RESEND_API_KEY não configurada — e-mail para %s não foi enviado.", to
        )
        logger.info("E-mail (fallback de desenvolvimento):\nAssunto: %s\n%s", subject, text or html)
        return False

    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.EMAIL_FROM,
                "to": [to],
                "subject": subject,
                "html": html,
                "text": text or html,
            },
            timeout=15,
        )
        response.raise_for_status()
        return True
    except Exception as exc:  # pragma: no cover
        logger.error("Falha ao enviar e-mail via Resend para %s: %s", to, exc)
        return False
