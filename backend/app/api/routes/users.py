"""
Rotas de usuários: perfil, atualização e troca de senha.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserOut, UserUpdate, UserUpdatePassword

router = APIRouter(prefix="/users", tags=["Usuários"])


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)) -> User:
    """Retorna o perfil do usuário autenticado."""
    return user


@router.put("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Atualiza os dados do perfil do usuário autenticado."""
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/me/password")
async def change_password(
    payload: UserUpdatePassword,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Altera a senha do usuário autenticado (exige a senha atual)."""
    if not verify_password(payload.senha_atual, user.senha_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha atual incorreta.")

    user.senha_hash = hash_password(payload.nova_senha)
    await db.commit()
    return {"message": "Senha alterada com sucesso."}
