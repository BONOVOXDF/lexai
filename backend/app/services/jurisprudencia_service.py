"""
Serviço de integração com a API pública de jurisprudência do TJDFT.

Fonte: https://jurisdf.tjdft.jus.br/api/v1/pesquisa (POST JSON)
Documentação: API Pública de Consulta à Jurisprudência do TJDFT.

Referência da requisição:
    POST /api/v1/pesquisa
    {
        "query": "termo",
        "termosAcessorios": [{"campo": "nomeRelator", "valor": "..."}],
        "pagina": 0,
        "tamanho": 10
    }
Campos permitidos em termosAcessorios:
    base, subbase, origem, uuid, identificador, identificadorOrdenacao,
    processo, nomeRelator, nomeRevisor, nomeRelatorDesignado,
    descricaoOrgaoJulgador, dataJulgamento, dataPublicacao, descricaoClasseCnj.
"""

import logging
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

JURISDF_BASE_URL = "https://jurisdf.tjdft.jus.br/api/v1/pesquisa"
TIMEOUT_SECONDS = 30


def _campos_para_filtros(
    tribunal: Optional[str],
    orgao: Optional[str],
    data_inicio: Optional[str],
    data_fim: Optional[str],
) -> List[Dict[str, str]]:
    """Traduz os filtros genéricos do LEX AI para termosAcessorios do TJDFT."""
    filtros: List[Dict[str, str]] = []
    if orgao:
        filtros.append({"campo": "descricaoOrgaoJulgador", "valor": orgao})
    if data_inicio:
        filtros.append({"campo": "dataPublicacao", "valor": data_inicio})
    if data_fim:
        filtros.append({"campo": "dataPublicacao", "valor": data_fim})
    return filtros


def _normalizar_registro(reg: Dict[str, Any]) -> Dict[str, Any]:
    """Converte um registro da API do TJDFT para o formato ResultadoPesquisa."""
    titulo = f"TJDFT - {reg.get('processo') or reg.get('identificador') or 'Decisão'}"
    data_raw = reg.get("dataPublicacao", "")
    data = data_raw[:10] if isinstance(data_raw, str) and len(data_raw) >= 10 else data_raw

    ementa = (reg.get("ementa") or "").strip()
    teor = (reg.get("inteiroTeor") or "").strip()
    resumo = ementa or (teor[:400] if teor else "")
    if not resumo:
        resumo = "Decisão disponível na íntegra no portal de jurisprudência do TJDFT."

    return {
        "titulo": titulo,
        "tipo": "jurisprudencia",
        "orgao": "TJDFT",
        "data": data or None,
        "resumo": resumo,
        "numero": reg.get("processo") or reg.get("identificador"),
        "teor": teor or None,
        "url": "https://jurisdf.tjdft.jus.br",
    }


async def pesquisar_jurisprudencia_externa(
    termo: str,
    tribunal: Optional[str] = None,
    orgao: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    limite: int = 10,
) -> List[Dict[str, Any]]:
    """
    Consulta a API pública de jurisprudência do TJDFT.

    Retorna lista de resultados normalizados. Em caso de falha (rede,
    timeout ou limitação), retorna lista vazia para o fallback local.
    """
    # A API do TJDFT cobre exclusivamente o tribunal local.
    if tribunal and tribunal.upper() not in ("", "TJDFT", "TJDISTRITOFEDERAL", "QUALQUER"):
        return []

    payload = {
        "query": termo,
        "termosAcessorios": _campos_para_filtros(tribunal, orgao, data_inicio, data_fim),
        "pagina": 0,
        "tamanho": limite,
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            resp = await client.post(JURISDF_BASE_URL, json=payload)
            resp.raise_for_status()
            dados = resp.json()
    except httpx.TimeoutException:
        logger.warning("TJDFT: timeout ao consultar jurisprudência para o termo %r", termo)
        return []
    except httpx.HTTPStatusError as exc:
        logger.warning("TJDFT: erro HTTP %s ao consultar jurisprudência", exc.response.status_code)
        return []
    except Exception as exc:  # noqa: BLE001
        logger.warning("TJDFT: falha ao consultar jurisprudência: %s", exc)
        return []

    registros = (dados or {}).get("registros") or []
    return [_normalizar_registro(reg) for reg in registros[:limite]]

