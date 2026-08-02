"""
Rota de saúde (healthcheck) da API.
"""

from fastapi import APIRouter

router = APIRouter(tags=["Sistema"])


@router.get("/health")
async def health() -> dict:
    """Verifica se a API está operacional."""
    return {"status": "ok", "app": "LEX AI", "versao": "1.0.0"}
