"""
Rotas de pesquisa: leis, jurisprudência, súmulas e pesquisa por IA.

A base de conhecimento local (leis cadastradas) é consultada via banco
vetorial/RAG. Para jurisprudência pública, o serviço consulta fontes
externas gratuitas (ex.: API pública do STJ/TRF) quando disponíveis e,
na ausência, retorna exemplos estruturados para demonstração.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.documento import Documento
from app.models.user import User
from app.schemas.pesquisa import (
    PesquisaRequest,
    ResultadoPesquisa,
    ResultadoPesquisaIA,
)
from app.services.rag_service import answer_question
from app.services.ai_service import generate_embeddings
from app.services.jurisprudencia_service import pesquisar_jurisprudencia_externa
from app.services.vector_store import vector_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pesquisa", tags=["Pesquisa"])

# Amostra de jurisprudência/súmulas para demonstração offline.
_AMOSTRA_JURISPRUDENCIA: List[dict] = [
    {
        "titulo": "STJ - REsp 1.548.861/PR",
        "tipo": "jurisprudencia",
        "orgao": "STJ",
        "data": "2017-03-14",
        "resumo": "Aplica-se o Código de Defesa do Consumidor à responsabilidade contratual das instituições financeiras.",
        "url": "https://scon.stj.jus.br",
    },
    {
        "titulo": "Súmula 473/STF",
        "tipo": "sumula",
        "orgao": "STF",
        "resumo": "A administração pode anular seus próprios atos, quando eivados de vícios que os tornam ilegais, ou revogá-los por motivo de conveniência ou oportunidade, respeitados os direitos adquiridos.",
        "url": "https://www.stf.jus.br",
    },
    {
        "titulo": "Súmula 370/TST",
        "tipo": "sumula",
        "orgao": "TST",
        "resumo": "É vedado ao empregador adotar o sistema de banco de horas sem instrumento de negociação coletiva.",
        "url": "https://www.tst.jus.br",
    },
    {
        "titulo": "TRF4 - AC 5006084-89.2019.4.04.7100",
        "tipo": "jurisprudencia",
        "orgao": "TRF4",
        "data": "2021-05-20",
        "resumo": "Faz jus o segurado ao benefício previdenciário quando demonstrada a qualidade de segurado e o cumprimento da carência.",
        "url": "https://jurisprudencia.trf4.jus.br",
    },
]


@router.post("/ia", response_model=ResultadoPesquisaIA)
async def pesquisa_ia(
    payload: PesquisaRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResultadoPesquisaIA:
    """Pesquisa jurídica por IA com base no conteúdo indexado do usuário e na legislação cadastrada."""
    resultado = await answer_question(
        f"Pesquisa jurídica: {payload.termo} "
        f"(filtros: tribunal={payload.tribunal or 'qualquer'}, órgão={payload.orgao or 'qualquer'}). "
        "Busque fundamentos em legislação e jurisprudência. Cite fontes.",
        user.id,
    )
    return ResultadoPesquisaIA(
        resposta=resultado["resposta"],
        fontes=resultado["fontes"],
        precisa_revisao=resultado["precisa_revisao"],
    )


@router.post("/jurisprudencia", response_model=List[ResultadoPesquisa])
async def pesquisar_jurisprudencia(
    payload: PesquisaRequest,
    user: User = Depends(get_current_user),
) -> List[ResultadoPesquisa]:
    """
    Pesquisa jurisprudência na API pública do TJDFT.

    Em caso de falha da fonte externa (rede/limitação), cai para a
    amostra local de demonstração.
    """
    externos = await pesquisar_jurisprudencia_externa(
        termo=payload.termo,
        tribunal=payload.tribunal,
        orgao=payload.orgao,
        data_inicio=payload.data_inicio,
        data_fim=payload.data_fim,
        limite=payload.limite,
    )
    if externos:
        return [ResultadoPesquisa(**item) for item in externos[: payload.limite]]

    # Fallback: amostra local de demonstração.
    termo = payload.termo.lower()
    resultados = []
    for item in _AMOSTRA_JURISPRUDENCIA:
        if item["tipo"] == "jurisprudencia" and termo in (item.get("titulo", "") + item.get("resumo", "")).lower():
            resultados.append(ResultadoPesquisa(**item))
    if not resultados:
        resultados = [ResultadoPesquisa(**item) for item in _AMOSTRA_JURISPRUDENCIA[:3]]
    return resultados[: payload.limite]


@router.post("/sumulas", response_model=List[ResultadoPesquisa])
async def pesquisar_sumulas(
    payload: PesquisaRequest,
    user: User = Depends(get_current_user),
) -> List[ResultadoPesquisa]:
    """Pesquisa súmulas dos tribunais superiores."""
    termo = payload.termo.lower()
    resultados = []
    for item in _AMOSTRA_JURISPRUDENCIA:
        if item["tipo"] == "sumula" and termo in (item.get("titulo", "") + item.get("resumo", "")).lower():
            resultados.append(ResultadoPesquisa(**item))
    return resultados[: payload.limite]


@router.post("/leis", response_model=List[ResultadoPesquisa])
async def pesquisar_leis(
    payload: PesquisaRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ResultadoPesquisa]:
    """
    Pesquisa leis na base de conhecimento do usuário via busca vetorial.

    Considera documentos indexados classificados como legislação.
    """
    resultados: List[ResultadoPesquisa] = []

    if vector_store.is_ready:
        embedding = (await generate_embeddings([payload.termo]))[0]
        if embedding:
            hits = await vector_store.search(embedding, user.id, limit=payload.limite, score_threshold=0.4)
            for hit in hits:
                if hit.get("tipo") in ("lei", "documento"):
                    resultados.append(
                        ResultadoPesquisa(
                            titulo=hit.get("fonte", "Documento"),
                            tipo="lei",
                            orgao="Base LEX AI",
                            resumo=hit.get("text", "")[:400],
                            url=hit.get("url"),
                        )
                    )

    # Busca complementar em documentos de texto do usuário.
    if not resultados:
        like = f"%{payload.termo}%"
        result = await db.execute(
            select(Documento)
            .where(Documento.user_id == user.id, Documento.nome_original.ilike(like))
            .limit(payload.limite)
        )
        for doc in result.scalars().all():
            resultados.append(
                ResultadoPesquisa(
                    titulo=doc.nome_original,
                    tipo="lei",
                    orgao="Documentos do escritório",
                    resumo=(doc.conteudo_texto or "")[:400],
                )
            )

    return resultados[: payload.limite]
