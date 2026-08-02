"""Schemas Pydantic de configurações da conta."""

from typing import Optional

from pydantic import BaseModel


class SettingsUpdate(BaseModel):
    """Preferências editáveis do usuário."""

    plano: Optional[str] = None
    preferencias: Optional[str] = None
    avatar_url: Optional[str] = None
