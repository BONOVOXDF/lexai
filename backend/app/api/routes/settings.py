"""
Rotas de configurações: perfil, plano, preferências e verificação de API key.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.settings import SettingsUpdate
from app.schemas.user import UserOut
from app.services.ai_service import ai_available

router = APIRouter(prefix="/settings", tags=["Configurações"])


@router.get("", response_model=dict)
async def get_settings(user: User = Depends(get_current_user)) -> dict:
    """Retorna as configurações atuais do usuário e status do sistema."""
    return {
        "usuario": UserOut.model_validate(user).model_dump(),
        "sistema": {
            "ia_disponivel": ai_available(),
            "plano": user.plano,
        },
    }


@router.put("", response_model=UserOut)
async def update_settings(
    payload: SettingsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Atualiza preferências e plano do usuário."""
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if value is not None and hasattr(user, field):
            setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user
