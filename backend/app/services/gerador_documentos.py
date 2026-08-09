"""
Gerador de documentos jurídicos a partir de modelos preenchidos com dados
do cliente e do advogado (sem IA — por algoritmo).

Modelos disponíveis: procuração, declaração de hipossuficiência e contrato
de honorários. Gera o texto e também a versão .docx para download.
"""

import logging
from datetime import datetime
from typing import Dict, Optional

from app.models.cliente import Cliente
from app.models.user import User

logger = logging.getLogger(__name__)

FUSO_BR = "America/Sao_Paulo"


class ModeloDocumento:
    """Define um modelo de documento disponível para geração."""

    def __init__(self, id: str, nome: str, template: str):
        self.id = id
        self.nome = nome
        self.template = template


MODELOS: Dict[str, ModeloDocumento] = {
    "procuracao": ModeloDocumento(
        id="procuracao",
        nome="Procuração Ad Judicia et Extra",
        template=(
            "PROCURAÇÃO AD JUDICIA ET EXTRA\n"
            "\n"
            "OUTORGANTE: {NOME_CLIENTE}, {CPF_CNPJ_LABEL} nº {CPF_CNPJ}, residente e "
            "domiciliado(a) em {ENDERECO}.\n"
            "\n"
            "OUTORGADO(A): {ADVOGADO}, inscrito(a) na OAB {OAB}, com endereço profissional "
            "em {ENDERECO_ESCRITORIO}.\n"
            "\n"
            "PODERES: pelo presente instrumento particular de mandato, o(a) outorgante nomeia "
            "e constitui seu bastante procurador o(a) outorgado(a), conferindo-lhe poderes para "
            "o foro em geral, com a cláusula \"ad judicia et extra\", em qualquer juízo, "
            "instância ou tribunal, para propor e contestar ações, em defesa de seus direitos e "
            "interesses, praticando todos os atos necessários ao bom e fiel cumprimento deste "
            "mandato, inclusive transigir, receber e dar quitação.\n"
            "\n"
            "{CIDADE}, {DATA}.\n"
            "\n"
            "________________________________________\n"
            "{NOME_CLIENTE} — OUTORGANTE\n"
        ),
    ),
    "hipossuficiencia": ModeloDocumento(
        id="hipossuficiencia",
        nome="Declaração de Hipossuficiência",
        template=(
            "DECLARAÇÃO DE HIPOSSUFICIÊNCIA\n"
            "\n"
            "Eu, {NOME_CLIENTE}, {CPF_CNPJ_LABEL} nº {CPF_CNPJ}, residente e domiciliado(a) em "
            "{ENDERECO}, declaro, para os fins do art. 98 e seguintes do Código de Processo Civil "
            "e da Lei nº 1.060/50, sob as penas da lei, que não possuo condições de arcar com as "
            "custas processuais e os honorários advocatícios sem prejuízo do sustento próprio ou "
            "de minha família.\n"
            "\n"
            "Declaro, ainda, que as informações prestadas são verdadeiras, ciente de que a "
            "falsidade de declaração constitui crime (art. 299 do Código Penal) e hipótese de "
            "condenação ao pagamento de custas, despesas processuais e honorários (art. 100 do CPC).\n"
            "\n"
            "{CIDADE}, {DATA}.\n"
            "\n"
            "________________________________________\n"
            "{NOME_CLIENTE} — DECLARANTE\n"
        ),
    ),
    "honorarios": ModeloDocumento(
        id="honorarios",
        nome="Contrato de Prestação de Serviços Advocatícios",
        template=(
            "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS\n"
            "\n"
            "CONTRATANTE: {NOME_CLIENTE}, {CPF_CNPJ_LABEL} nº {CPF_CNPJ}, residente e "
            "domiciliado(a) em {ENDERECO}, doravante denominado(a) simplesmente CONTRATANTE.\n"
            "\n"
            "CONTRATADO(A): {ADVOGADO}, inscrito(a) na OAB {OAB}, doravante denominado(a) "
            "simplesmente CONTRATADO(A).\n"
            "\n"
            "CLÁUSULA PRIMEIRA — DO OBJETO: O CONTRATADO prestará serviços de advocacia ao "
            "CONTRATANTE, em caráter de mandato judicial e extrajudicial, promovendo a defesa de "
            "seus interesses perante juízos, tribunais e repartições públicas.\n"
            "\n"
            "CLÁUSULA SEGUNDA — DOS HONORÁRIOS: Pelos serviços ora contratados, o CONTRATANTE "
            "pagará ao CONTRATADO honorários advocatícios conforme avençado entre as partes, "
            "observadas as disposições do Estatuto da Advocacia e da tabela de honorários da OAB.\n"
            "\n"
            "CLÁUSULA TERCEIRA — DA RESCISÃO: O presente contrato poderá ser rescindido por "
            "qualquer das partes, mediante comunicação prévia, garantida a remuneração pelos "
            "serviços efetivamente prestados.\n"
            "\n"
            "CLÁUSULA QUARTA — DO FORO: Fica eleito o foro da comarca do domicílio do CONTRATANTE "
            "para dirimir quaisquer dúvidas oriundas do presente contrato.\n"
            "\n"
            "E, por estarem justas e contratadas, as partes firmam o presente instrumento em duas "
            "vias de igual teor.\n"
            "\n"
            "{CIDADE}, {DATA}.\n"
            "\n"
            "________________________________________\n"
            "{NOME_CLIENTE} — CONTRATANTE\n"
            "\n"
            "________________________________________\n"
            "{ADVOGADO} — CONTRATADO(A)\n"
        ),
    ),
}


def _formatar_cpf(cpf: Optional[str]) -> str:
    """Mascara um CPF (11 dígitos) no formato 000.000.000-00."""
    if not cpf:
        return "____________________"
    digitos = "".join(c for c in cpf if c.isdigit())
    if len(digitos) == 11:
        return f"{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:]}"
    return cpf


def _formatar_cnpj(cnpj: Optional[str]) -> str:
    """Mascara um CNPJ (14 dígitos) no formato 00.000.000/0000-00."""
    if not cnpj:
        return "____________________"
    digitos = "".join(c for c in cnpj if c.isdigit())
    if len(digitos) == 14:
        return f"{digitos[:2]}.{digitos[2:5]}.{digitos[5:8]}/{digitos[8:12]}-{digitos[12:]}"
    return cnpj


def _cidade_do_endereco(endereco: Optional[str]) -> str:
    """Tenta extrair a cidade/UF do final do endereço (heurística simples)."""
    if not endereco:
        return "____________________"
    partes = [p.strip() for p in endereco.split(",") if p.strip()]
    if len(partes) >= 2:
        return partes[-1]
    return "____________________"


def _preencher(cliente: Cliente, advogado: User, modelo: ModeloDocumento) -> str:
    """Substitui os marcadores do modelo pelos dados reais."""
    cpf_cnpj = cliente.cnpj or cliente.cpf
    cpf_cnpj_label = "CNPJ" if cliente.cnpj else "CPF"
    cpf_cnpj_valor = _formatar_cnpj(cliente.cnpj) if cliente.cnpj else _formatar_cpf(cliente.cpf)

    data = datetime.now().strftime("%d/%m/%Y")
    valores = {
        "NOME_CLIENTE": cliente.nome,
        "CPF_CNPJ_LABEL": cpf_cnpj_label,
        "CPF_CNPJ": cpf_cnpj_valor or "____________________",
        "ENDERECO": cliente.endereco or "____________________",
        "CIDADE": _cidade_do_endereco(cliente.endereco),
        "ADVOGADO": advogado.nome,
        "OAB": advogado.oab or "____________________",
        "ENDERECO_ESCRITORIO": "____________________",
        "DATA": data,
    }
    texto = modelo.template
    for chave, valor in valores.items():
        texto = texto.replace("{" + chave + "}", str(valor))
    return texto


def listar_modelos() -> list[dict]:
    """Lista os modelos disponíveis para a API."""
    return [{"id": m.id, "nome": m.nome} for m in MODELOS.values()]


def gerar_documento_texto(cliente: Cliente, advogado: User, modelo_id: str) -> dict:
    """Gera o documento em texto puro a partir do modelo informado."""
    modelo = MODELOS.get(modelo_id)
    if modelo is None:
        raise ValueError("Modelo não encontrado.")
    return {
        "modelo": modelo.id,
        "titulo": modelo.nome,
        "conteudo": _preencher(cliente, advogado, modelo),
    }


def gerar_documento_docx(cliente: Cliente, advogado: User, modelo_id: str) -> bytes:
    """Gera o documento em .docx (bytes) para download."""
    from io import BytesIO

    from docx import Document

    modelo = MODELOS.get(modelo_id)
    if modelo is None:
        raise ValueError("Modelo não encontrado.")

    texto = _preencher(cliente, advogado, modelo)
    doc = Document()
    for paragrafo in texto.split("\n"):
        if paragrafo.strip():
            doc.add_paragraph(paragrafo.strip())

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.read()
