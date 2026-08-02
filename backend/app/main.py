"""
Aplicação principal do backend LEX AI (FastAPI).

Configura middleware, CORS, rate limiting global, inicialização de
banco de dados e registro das rotas.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings
from app.database.session import dispose_engine, init_db
from app.services.redis_client import close_redis_client
from app.services.vector_store import vector_store

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa e encerra recursos (DB, Redis, banco vetorial)."""
    try:
        await init_db()
    except Exception as exc:
        logger.warning("Não foi possível inicializar o banco: %s", exc)
    await vector_store.initialize()
    logger.info("%s iniciado em modo %s.", settings.APP_NAME, settings.APP_ENV)
    yield
    await vector_store.close()
    await close_redis_client()
    await dispose_engine()


app = FastAPI(
    title=settings.APP_NAME,
    description="API da plataforma LEX AI — Inteligência Artificial para Advogados.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Aplica rate limit global por IP (exceto rotas de health)."""
    if settings.RATE_LIMIT_ENABLED and request.url.path != "/api/health":
        from app.services.rate_limit import check_rate_limit

        client_ip = request.client.host if request.client else "unknown"
        allowed, retry_after = await check_rate_limit(f"ip:{client_ip}")
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Muitas requisições. Tente novamente em instantes."},
                headers={"Retry-After": str(retry_after or 1)},
            )
    return await call_next(request)


app.include_router(api_router)


@app.get("/")
async def root() -> dict:
    """Endpoint raiz com informações da API."""
    return {
        "app": settings.APP_NAME,
        "slogan": "A Inteligência Artificial para Advogados.",
        "docs": "/docs",
        "status": "online",
    }
