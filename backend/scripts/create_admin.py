import asyncio
import sys

sys.path.insert(0, ".")

from sqlalchemy import select

from app.core.security import hash_password
from app.database.base import Base
from app.database.session import engine, async_session_factory as async_session
from app.models.user import User


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    email = "admin@lexai.com"
    senha = "LexAdmin@2026"
    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.is_superuser = True
            user.is_active = True
            user.plano = "pro"
            user.nome = "Administrador LEX AI"
            user.senha_hash = hash_password(senha)
            print(f"Usuário existente atualizado: {email} (is_superuser={user.is_superuser})")
        else:
            user = User(
                nome="Administrador LEX AI",
                email=email,
                senha_hash=hash_password(senha),
                plano="pro",
                is_active=True,
                is_superuser=True,
            )
            db.add(user)
            print(f"Admin criado: {email}")
        await db.commit()
        await db.refresh(user)
        print(f"ID={user.id} superuser={user.is_superuser} plano={user.plano}")


asyncio.run(main())
