"""Smoke test do backend LEX AI (usa SQLite em memória)."""

import os
import sys

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./smoke_test.db"
os.environ["VECTOR_STORE"] = "none"
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["OPENAI_API_KEY"] = ""

# Garante um banco limpo a cada execução dos testes.
_DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "smoke_test.db")
if os.path.exists(_DB_FILE):
    os.remove(_DB_FILE)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_register_login_flow(client):
    payload = {
        "nome": "Advogado Teste",
        "email": "advogado@lexai.com",
        "telefone": "11999999999",
        "oab": "SP 123456",
        "senha": "senha-segura-123",
        "confirmar_senha": "senha-segura-123",
    }
    r = client.post("/api/auth/register", json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"] == "advogado@lexai.com"

    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Login
    r = client.post("/api/auth/login", json={"email": "advogado@lexai.com", "senha": "senha-segura-123"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Me
    r = client.get("/api/users/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["nome"] == "Advogado Teste"


def test_clientes_crud(client):
    token = _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post("/api/clientes", json={"nome": "Cliente A", "cpf": "12345678901", "tipo": "pessoa_fisica"}, headers=headers)
    assert r.status_code == 201, r.text
    cliente_id = r.json()["id"]

    r = client.get("/api/clientes", headers=headers)
    assert r.status_code == 200
    assert r.json()["total"] >= 1

    r = client.put(f"/api/clientes/{cliente_id}", json={"telefone": "11988887777"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["telefone"] == "11988887777"

    r = client.delete(f"/api/clientes/{cliente_id}", headers=headers)
    assert r.status_code == 200


def test_processos_crud(client):
    token = _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post(
        "/api/processos",
        json={"numero": "1001234-56.2024.8.26.0100", "tribunal": "TJSP", "classe": "Procedimento Comum", "status": "em_andamento"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    processo_id = r.json()["id"]

    r = client.get("/api/processos", headers=headers)
    assert r.status_code == 200

    r = client.put(f"/api/processos/{processo_id}", json={"status": "arquivado"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "arquivado"


def test_conversas_fluxo(client):
    token = _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post("/api/conversas", json={"titulo": "Pesquisa trabalhista"}, headers=headers)
    assert r.status_code == 201, r.text
    conversa_id = r.json()["id"]

    r = client.post(
        f"/api/conversas/{conversa_id}/mensagens",
        json={"conteudo": "Quais os requisitos da justa causa?"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    assert "resposta" in r.json() or "mensagem" in r.json()
    body = r.json()
    assert body["mensagem"]["conteudo"]  # resposta da IA (fallback sem key)

    r = client.get(f"/api/conversas/{conversa_id}", headers=headers)
    assert r.status_code == 200
    assert len(r.json()["mensagens"]) == 2


def test_peticoes_gerar_sem_ia(client):
    token = _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post("/api/peticoes", json={"titulo": "Petição manual", "tipo": "inicial", "conteudo": "Rascunho"}, headers=headers)
    assert r.status_code == 201, r.text
    peticao_id = r.json()["id"]

    r = client.get("/api/peticoes", headers=headers)
    assert r.status_code == 200

    r = client.post(
        f"/api/peticoes/{peticao_id}/export?formato=word",
        headers=headers,
    )
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/vnd.openxml")

    r = client.post(
        f"/api/peticoes/{peticao_id}/export?formato=pdf",
        headers=headers,
    )
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"


def test_agenda_e_financeiro(client):
    token = _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post(
        "/api/agenda",
        json={"titulo": "Audiência", "tipo": "audiencia", "data_inicio": "2026-08-10", "hora_inicio": "10:00"},
        headers=headers,
    )
    assert r.status_code == 201, r.text

    r = client.post(
        "/api/financeiro",
        json={"tipo": "receita", "categoria": "honorarios", "descricao": "Honorários", "valor": 5000.0, "data": "2026-08-01"},
        headers=headers,
    )
    assert r.status_code == 201, r.text

    r = client.get("/api/financeiro/resumo", headers=headers)
    assert r.status_code == 200
    assert r.json()["receitas_total"] == 5000.0


def test_dashboard(client):
    token = _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    r = client.get("/api/dashboard", headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "stats" in data
    assert data["stats"]["total_clientes"] >= 0


def test_leads_fluxo(client):
    # Captura pública (lead magnet) — sem autenticação.
    r = client.post(
        "/api/leads",
        json={"nome": "Advogado Lead", "email": "lead@lexai.com", "origem": "kit-modelos"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["email"] == "lead@lexai.com"

    # Idempotência: mesmo e-mail não cria duplicata.
    r = client.post(
        "/api/leads",
        json={"nome": "Advogado Lead", "email": "lead@lexai.com"},
    )
    assert r.status_code == 201
    assert r.json()["id"] == 1 or r.json()["id"] > 0

    # Marcar download do kit.
    r = client.post("/api/leads/baixar-kit", json={"email": "lead@lexai.com"})
    assert r.status_code == 200
    assert r.json()["ok"] is True

    # Listagem restrita a administradores.
    r = client.get("/api/leads")
    assert r.status_code == 401

    # Promove o usuário a superuser para validar a listagem.
    from app.database.session import async_session_factory
    from app.models.user import User as UserModel
    from sqlalchemy import select

    import asyncio

    async def _promote():
        async with async_session_factory() as db:
            result = await db.execute(select(UserModel).where(UserModel.email == "advogado@lexai.com"))
            user = result.scalar_one_or_none()
            if user is not None:
                user.is_superuser = True
                await db.commit()

    asyncio.run(_promote())

    token = _login(client)
    headers = {"Authorization": f"Bearer {token}"}
    r = client.get("/api/leads", headers=headers)
    assert r.status_code == 200, r.text
    assert any(lead["email"] == "lead@lexai.com" for lead in r.json())


def test_assinatura_fluxo(client):
    token = _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Sem token do Mercado Pago configurado, o checkout deve falhar com 503.
    r = client.post("/api/assinatura/checkout", json={"plano": "pro"}, headers=headers)
    assert r.status_code == 503, r.text

    # Situação da assinatura: usuário recém-registrado está no plano free.
    r = client.get("/api/assinatura", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["plano_atual"] == "free"
    assert r.json()["plano_expira_em"] is None
    assert r.json()["precos"]["pro"] > 0

    # Webhook com payment desconhecido não deve quebrar.
    r = client.post(
        "/api/webhooks/mercadopago",
        json={"type": "payment", "data": {"id": "desconhecido-123"}},
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True

    # Webhook de tipo irrelevante responde ok imediatamente.
    r = client.post(
        "/api/webhooks/mercadopago",
        json={"type": "preapproval", "data": {"id": "123"}},
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True


def _login(client) -> str:
    r = client.post("/api/auth/login", json={"email": "advogado@lexai.com", "senha": "senha-segura-123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]
