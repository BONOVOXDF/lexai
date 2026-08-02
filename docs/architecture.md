# LEX AI — Arquitetura

> **Slogan:** A Inteligência Artificial para Advogados.

O LEX AI é uma plataforma SaaS brasileira de inteligência artificial para
advogados e escritórios de advocacia, construída como um **monorepo** com
frontend e backend separados.

---

## Visão geral

```
┌─────────────────┐        ┌──────────────────────┐
│  Frontend       │  HTTP  │  Backend (FastAPI)   │
│  Next.js 15     │ ─────► │  Porta 8000          │
│  Porta 3000     │  JSON  │  /api/*              │
└─────────────────┘        └──────────┬───────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
        ┌───────────┐          ┌───────────┐          ┌────────────┐
        │ PostgreSQL│          │   Redis   │          │  Qdrant /  │
        │ (dados)   │          │ (cache/   │          │  ChromaDB  │
        │           │          │  rate limit)          │ (vetores)  │
        └───────────┘          └───────────┘          └────────────┘
                                                             │
                                                    ┌────────▼────────┐
                                                    │ OpenAI API      │
                                                    │ (chat/embeddings│
                                                    └─────────────────┘
```

## Estrutura do monorepo

```
lex-ai/
├── backend/                # FastAPI + SQLAlchemy 2.0 (async)
│   ├── app/
│   │   ├── api/            # Rotas (router.py + routes/*)
│   │   ├── core/           # Config, segurança, dependências
│   │   ├── database/       # Base declarativa + sessão async
│   │   ├── models/         # Modelos ORM
│   │   ├── schemas/        # Schemas Pydantic (request/response)
│   │   └── services/       # Regras de negócio (IA, vetores, upload…)
│   ├── tests/              # Testes de fumaça
│   ├── requirements.txt
│   └── .env.example
├── frontend/               # Next.js 15 App Router + Tailwind
│   ├── app/                # Páginas (landing, auth, dashboard)
│   ├── components/         # UI e componentes de domínio
│   ├── lib/                # Cliente HTTP, tipos, auth, utils
│   └── .env.example
├── docker/                 # Dockerfiles do backend e frontend
├── scripts/                # Utilitários (ex.: generate_secret.py)
├── docker-compose.yml
├── .github/workflows/ci.yml
└── docs/                   # Documentação
```

## Stack

| Camada     | Tecnologia                                                        |
| ---------- | ----------------------------------------------------------------- |
| Frontend   | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, framer-motion, Radix UI, lucide-react |
| Backend    | Python 3.14, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2         |
| Banco      | PostgreSQL (produção) / SQLite (dev, fallback automático)         |
| Cache      | Redis (rate limit e cache)                                        |
| Vetores    | Qdrant (padrão) ou ChromaDB; `VECTOR_STORE=none` desativa o RAG   |
| IA         | OpenAI API (`OPENAI_API_KEY`): chat completions + embeddings      |
| Infra      | Docker Compose, GitHub Actions (CI)                               |

## Autenticação

- **JWT em pares:** `access_token` (curta duração) + `refresh_token` (longa).
- Fluxo: `POST /api/auth/register` ou `/login` → salva os dois tokens e o
  usuário no `localStorage` do navegador.
- O frontend injeta `Authorization: Bearer <access_token>` em todas as
  requisições e **renova automaticamente** via `POST /api/auth/refresh`
  quando recebe `401` (`lib/api.ts`).
- Senhas com hash via bcrypt (`app/core/security.py`).
- Suporte a login Google (`/api/auth/google`).

## Fluxo RAG (Retrieval-Augmented Generation)

1. **Upload** de documentos (PDF, DOCX, PPTX, imagens/OCR, TXT) →
   `document_service.py` valida, salva e extrai texto.
2. **Indexação** → texto fatiado em *chunks* (`rag_service._split_text_simples`,
   fallback interno auto-contido; em produção pode usar langchain) e vetorizado
   por embeddings da OpenAI.
3. **Busca** → cada pergunta é vetorizada e comparada aos documentos do usuário
   no banco vetorial, com **isolamento por `user_id`** no payload.
4. **Resposta** → o contexto recuperado é injetado no prompt do modelo, que
   responde **citando fontes**. Respostas exigem revisão (`precisa_revisao=true`).

> ⚠️ Quando `OPENAI_API_KEY` não está configurada, o sistema degrada
> graciosamente: a IA responde que está indisponível e o upload continua
> funcionando (documento marcado como não indexado).

## Camadas e convenções do backend

- **Rotas finas, services grossos:** rotas validam/autenticam e delegam a
  regra de negócio para `app/services/*`.
- **Isolamento multi-tenant:** todo recurso pertence a um `user_id`; todas as
  consultas filtram por usuário autenticado.
- **Pydantic v2:** `model_validate`, `model_dump(exclude_unset=True)`.
- **SQLAlchemy async:** sessão `AsyncSession` injetada via `Depends(get_db)`.
- **Respostas paginadas:** esquema genérico `Paginated[T]` em
  `app/schemas/common.py`.

## Configuração de ambiente

Ver `backend/.env.example` e `frontend/.env.example`. Variáveis principais:

| Variável                  | Uso                                          | Padrão          |
| ------------------------- | -------------------------------------------- | --------------- |
| `DATABASE_URL`            | Conexão do banco                             | SQLite local    |
| `SECRET_KEY`              | Assinatura dos JWT                           | obrigatória     |
| `OPENAI_API_KEY`          | Chave da OpenAI (IA)                         | vazia           |
| `VECTOR_STORE`            | `qdrant` \| `chroma` \| `none`               | `qdrant`        |
| `REDIS_URL`               | Cache/rate limit (opcional)                  | opcional        |
| `NEXT_PUBLIC_API_URL`     | URL do backend (frontend)                    | `http://localhost:8000` |
| `NEXT_PUBLIC_APP_URL`     | URL do próprio frontend                      | `http://localhost:3000` |

Gere a `SECRET_KEY` com `python scripts/generate_secret.py`.

## Execução local

```bash
# Backend
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env                           # edite as variáveis
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

# Testes de fumaça do backend
cd backend
.venv\Scripts\python -m pytest tests -q
```

## Produção

- `docker-compose.yml` orquestra `postgres`, `redis`, `qdrant`, `backend` e
  `frontend`.
- O frontend usa `output: "standalone"` (Next.js) para imagem enxuta.
- CI (`/.github/workflows/ci.yml`) instala dependências, roda os testes e faz
  o build do frontend.

## LGPD e privacidade

- Exclusão de documento também remove seus vetores do índice
  (`/api/documentos/{id}` com DELETE).
- Dados são sempre escopados por usuário; documentos de clientes não são
  compartilhados entre contas.
- Documentos gerados por IA exibem aviso de revisão obrigatória por advogado.
