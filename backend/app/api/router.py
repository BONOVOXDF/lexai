"""
Rotas da API v1.
"""

from fastapi import APIRouter

from app.api.routes import (
    agenda,
    assistente,
    auth,
    clientes,
    conversas,
    dashboard,
    documentos,
    financeiro,
    health,
    leads,
    pesquisa,
    peticoes,
    processos,
    settings,
    users,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/api")
api_router.include_router(auth.router, prefix="/api")
api_router.include_router(users.router, prefix="/api")
api_router.include_router(clientes.router, prefix="/api")
api_router.include_router(processos.router, prefix="/api")
api_router.include_router(documentos.router, prefix="/api")
api_router.include_router(conversas.router, prefix="/api")
api_router.include_router(assistente.router, prefix="/api")
api_router.include_router(peticoes.router, prefix="/api")
api_router.include_router(pesquisa.router, prefix="/api")
api_router.include_router(agenda.router, prefix="/api")
api_router.include_router(financeiro.router, prefix="/api")
api_router.include_router(dashboard.router, prefix="/api")
api_router.include_router(settings.router, prefix="/api")
api_router.include_router(leads.router, prefix="/api")
