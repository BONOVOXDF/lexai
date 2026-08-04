# AGENTS.md

## Idioma

- Responda SEMPRE em **português brasileiro** (pt-BR), incluindo mensagens, explicações e raciocínio.
- Não escreva textos da interface nem do código em inglês, exceto identificadores/APIs.

## Projeto

- Repositório: LEX AI — backend FastAPI (`backend/`) + frontend Next.js (`frontend/`).
- Deploy automático via push para `main`: Railway (backend) + Vercel (frontend).

## Comandos (verificação)

- Backend (em `backend/`): `.venv\Scripts\python.exe -m pytest tests -q` (o crash de "access violation" na saída é conhecido do Windows e não indica falha; conferir "N passed").
- Frontend (em `frontend/`): `npx tsc --noEmit` e `npm run lint`. NUNCA rodar `npm run build` local (RAM limitada).

## Convenções

- Commits após cada bloco de trabalho validado (histórico em português).
- Variáveis sensíveis apenas em variáveis de ambiente; nunca commitar segredos.
