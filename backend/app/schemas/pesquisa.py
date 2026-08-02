"""Schemas Pydantic para pesquisa (leis, jurisprudência, súmulas)."""

from typing import List, Optional

from pydantic import BaseModel, Field


class PesquisaRequest(BaseModel):
    """Parâmetros gerais de pesquisa."""

    termo: str = Field(..., min_length=3)
    tribunal: Optional[str] = None
    orgao: Optional[str] = None
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    limite: int = Field(default=10, ge=1, le=50)


class ResultadoPesquisa(BaseModel):
    """Item de resultado genérico (lei, jurisprudência ou súmula)."""

    titulo: str
    tipo: str
    orgao: Optional[str] = None
    data: Optional[str] = None
    resumo: str
    url: Optional[str] = None
    numero: Optional[str] = None
    teor: Optional[str] = None


class ResultadoPesquisaIA(BaseModel):
    """Resposta da pesquisa por IA com fontes."""

    resposta: str
    fontes: List[dict] = []
    precisa_revisao: bool = False
