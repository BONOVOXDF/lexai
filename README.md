# LEX AI

> **A Inteligência Artificial para Advogados.**

Plataforma SaaS que auxilia advogados e escritórios de advocacia por meio de Inteligência Artificial. A plataforma **não substitui o advogado** — atua como ferramenta de apoio para pesquisa, organização, geração de documentos e análise de informações.

---

## Visão Geral

| Camada | Tecnologia |
| ------ | ---------- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, Framer Motion, shadcn/ui, Lucide Icons |
| Backend | Python, FastAPI, SQLAlchemy 2.0 |
| Banco de Dados | PostgreSQL |
| Cache / Fila | Redis |
| Autenticação | JWT + Supabase Authentication (opcional) |
| IA | OpenAI API + RAG (Embeddings + Banco Vetorial Qdrant) |
| Hospedagem | Vercel (Frontend) / Railway (Backend) |
| Infraestrutura | Docker, GitHub Actions |

---

## Estrutura do Repositório

```
lex-ai/
├── frontend/            # Aplicação Next.js
│   ├── app/             # Páginas (App Router)
│   ├── components/      # Componentes reutilizáveis
│   ├── hooks/           # Hooks customizados
│   ├── services/        # Clientes de API
│   └── lib/             # Utilitários e tipos
├── backend/             # API FastAPI
│   ├── app/
│   │   ├── api/         # Rotas HTTP
│   │   ├── core/        # Config, segurança, dependências
│   │   ├── database/    # Sessão e base declarativa
│   │   ├── models/      # Modelos SQLAlchemy
│   │   ├── schemas/     # Schemas Pydantic
│   │   └── services/    # Serviços (IA, RAG, documentos)
│   └── requirements.txt
├── docker/              # Dockerfile(s) e docker-compose
├── docs/                # Documentação técnica
└── scripts/             # Scripts de apoio
```

---

## Funcionalidades

- **Assistente IA** — chat com contexto recuperado via RAG, upload de PDF/DOCX/imagens, resposta em Markdown, histórico, favoritos e exportação.
- **Gerador de Petições** — inicial, contestação, agravo, apelação, mandado de segurança, contrato, procuração e parecer; edição antes da exportação (Word/PDF).
- **Pesquisa** — leis, jurisprudência, súmulas e pesquisa por IA com filtros.
- **Clientes, Processos, Agenda, Documentos, Financeiro e Configurações** — CRUD completo e relatórios.

---

## Como Executar

### 1. Requisitos

- Node.js ≥ 18
- Python ≥ 3.11
- PostgreSQL (recomendado: Neon — banco gerenciado, tier gratuito) ou Docker + Docker Compose

### 2. Criar o banco (Neon — recomendado)

1. Crie uma conta gratuita em https://neon.tech e um projeto (região próxima de você, ex.: São Paulo).
2. Copie a connection string (formato `postgresql://...neon.tech/lexai?sslmode=require`).
3. No `backend/.env`, defina:

```bash
DATABASE_URL=postgresql://usuario:senha@ep-nome.region.aws.neon.tech/lexai?sslmode=require
```

> **Importante:** o SQLAlchemy async espera o driver `asyncpg`. Se a string do Neon vier sem o driver, o `session.py` faz o fallback para SQLite — por isso use o formato acima (pode começar com `postgresql+asyncpg://`).

### 3. Subir infraestrutura (Docker, opcional)

```bash
docker compose up -d
```

### 4. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Linux/macOS
pip install -r requirements.txt
copy .env.example .env        # configure as variáveis
uvicorn app.main:app --reload
```

Documentação da API: http://localhost:8000/docs

### 4. Frontend

```bash
cd frontend
npm install
copy .env.example .env.local  # configure a URL da API
npm run dev
```

Acesse: http://localhost:3000

### Migração de dados (SQLite → PostgreSQL)

Se você usava SQLite durante o desenvolvimento e quer aproveitar os dados:

```bash
cd backend
# 1. Certifique-se de que backend/.env aponta para o PostgreSQL (Neon) e rode o backend
#    para que as tabelas sejam criadas automaticamente (init_db).
# 2. Migre os dados do banco de desenvolvimento:
python scripts/migrate_to_postgres.py
```

O script cria as tabelas no PostgreSQL, copia os registros preservando os IDs e ajusta as sequences. Para recriar o usuário administrador no banco novo:

```bash
cd backend
python scripts/create_admin.py
```

> Alternativa: se preferir começar limpo (sem os dados de teste), basta apontar a `DATABASE_URL` para o PostgreSQL e rodar `scripts/create_admin.py` — as tabelas são criadas sozinhas na primeira execução.

---

## Variáveis de Ambiente

### Backend (`.env`)

```
DATABASE_URL=postgresql+asyncpg://usuario:senha@ep-xxxx.region.aws.neon.tech/lexai?ssl=require
REDIS_URL=rediss://default:<token>@<host>.upstash.io:6379
SECRET_KEY=...
ACCESS_TOKEN_EXPIRE_MINUTES=60
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=lexai_documents
CORS_ORIGINS=http://localhost:3000
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
RATE_LIMIT_ENABLED=true
```

### Frontend (`.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Segurança

- JWT com expiração e refresh tokens.
- Senhas com hash BCrypt.
- Rate limit por usuário/IP (Redis).
- Validação de tipos/tamanho de arquivos enviados.
- Controle de permissões por usuário (dados isolados por `user_id`).
- Conformidade com LGPD: criptografia em trânsito (HTTPS), minimização de dados e exclusão lógica.
- Documentos: o banco vetorial só armazena embeddings (não o conteúdo bruto), e o acesso é segmentado por usuário.

---

## Licença

Software proprietário — LEX AI. Todos os direitos reservados.
