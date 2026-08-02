# LEX AI — Referência da API

Base URL local: `http://localhost:8000` · Todas as rotas têm prefixo `/api`.

Autenticação: `Authorization: Bearer <access_token>` (exceto nas rotas públicas).

Formato de erro: `{"detail": "mensagem"}` com o código HTTP adequado.

---

## Respostas paginadas

A maioria das listagens retorna:

```json
{ "items": [...], "total": 5, "page": 1, "page_size": 20, "pages": 1 }
```

---

## Autenticação (`/api/auth`)

| Método | Rota             | Corpo                                                                                  | Descrição                            |
| ------ | ---------------- | -------------------------------------------------------------------------------------- | ------------------------------------ |
| POST   | `/register`      | `{ nome, email, senha, confirmar_senha, telefone?, oab? }`                             | Cria conta e retorna tokens          |
| POST   | `/login`         | `{ email, senha }`                                                                     | Login e retorna tokens               |
| POST   | `/refresh`       | `{ refresh_token }`                                                                    | Renova o par de tokens               |
| POST   | `/forgot-password` | `{ email }`                                                                          | Solicita recuperação de senha        |
| POST   | `/reset-password` | `{ token, nova_senha }`                                                               | Redefine a senha                     |
| POST   | `/google`        | `{ token }` (id_token do Google)                                                       | Login social                         |
| GET    | `/me`            | —                                                                                      | Dados do usuário autenticado         |

Resposta de login/registro:

```json
{
  "access_token": "…",
  "refresh_token": "…",
  "token_type": "bearer",
  "user": { "id": 1, "nome": "…", "email": "…", "plano": "free", "is_active": true }
}
```

---

## Usuários (`/api/users`) — autenticado

| Método | Rota         | Corpo                                                           | Descrição                     |
| ------ | ------------ | --------------------------------------------------------------- | ----------------------------- |
| GET    | `/me`        | —                                                               | Perfil atual                  |
| PUT    | `/me`        | `{ nome?, telefone?, oab?, avatar_url?, preferencias? }`        | Atualiza o perfil             |
| PUT    | `/me/password` | `{ senha_atual, nova_senha }`                                 | Troca de senha                |

---

## Clientes (`/api/clientes`) — autenticado

| Método | Rota            | Corpo                                                                               | Descrição          |
| ------ | --------------- | ----------------------------------------------------------------------------------- | ------------------ |
| GET    | ``              | query: `q?`, `page?`, `page_size?`                                                  | Lista com busca    |
| GET    | `/{id}`         | —                                                                                   | Detalhe            |
| POST   | ``              | `{ nome, tipo, cpf?, cnpj?, telefone?, email?, endereco?, anotacoes? }`             | Cria cliente       |
| PUT    | `/{id}`         | qualquer campo acima                                                               | Atualiza cliente   |
| DELETE | `/{id}`         | —                                                                                   | Exclui cliente     |

---

## Processos (`/api/processos`) — autenticado

| Método | Rota    | Corpo                                                                                          | Descrição   |
| ------ | ------- | ---------------------------------------------------------------------------------------------- | ----------- |
| GET    | ``      | query: `status?`, `cliente_id?`, `q?`, `page?`, `page_size?`                                  | Lista       |
| GET    | `/{id}` | —                                                                                              | Detalhe     |
| POST   | ``      | `{ numero, tribunal?, classe?, vara?, comarca?, advogado?, status?, prazo?, observacoes?, valor_causa?, cliente_id? }` | Cria        |
| PUT    | `/{id}` | qualquer campo acima                                                                          | Atualiza    |
| DELETE | `/{id}` | —                                                                                              | Exclui      |

`status`: `em_andamento | arquivado | suspenso | concluido | distribuido`.

---

## Documentos (`/api/documentos`) — autenticado

| Método | Rota                    | Corpo/Form                                   | Descrição                             |
| ------ | ----------------------- | ------------------------------------------- | ------------------------------------- |
| GET    | ``                      | query: `q?`, `processo_id?`, `cliente_id?`  | Lista documentos                      |
| POST   | `/upload`               | `multipart/form-data`: `file`, `processo_id?`, `cliente_id?` | Upload + extração + indexação |
| POST   | `/{id}/resumo`          | —                                           | Gera resumo com IA                    |
| GET    | `/{id}/download`        | —                                           | Baixa o arquivo original              |
| PUT    | `/{id}`                 | `{ nome_original?, processo_id?, cliente_id? }` | Atualiza metadados                 |
| DELETE | `/{id}`                 | —                                           | Exclui arquivo e vetores (LGPD)       |
| GET    | `/pesquisa/textual`     | query: `q`                                  | Busca por texto no conteúdo indexado  |

---

## Conversas do Assistente (`/api/conversas`) — autenticado

| Método | Rota                  | Corpo                                        | Descrição                          |
| ------ | --------------------- | -------------------------------------------- | ---------------------------------- |
| GET    | ``                    | query: `favoritas?`, `page?`, `page_size?`   | Lista conversas                    |
| GET    | `/{id}`               | —                                            | Conversa + mensagens               |
| POST   | ``                    | `{ titulo? }`                                | Nova conversa                      |
| PUT    | `/{id}`               | `{ titulo?, is_favorita? }`                  | Atualiza (favoritar/renomear)      |
| DELETE | `/{id}`               | —                                            | Exclui conversa e mensagens        |
| POST   | `/{id}/mensagens`     | `{ conteudo }`                               | Envia pergunta e recebe resposta RAG |
| GET    | `/{id}/export`        | —                                            | Exporta a conversa em Markdown     |

Resposta de `POST /{id}/mensagens`:

```json
{
  "conversa_id": 1,
  "mensagem": {
    "id": 5,
    "conversa_id": 1,
    "tipo": "assistente",
    "conteudo": "…",
    "fontes": "[{\"fonte\": \"peticao.docx\", \"trecho\": \"…\"}]",
    "precisa_revisao": true,
    "created_at": "2026-08-01T12:00:00"
  }
}
```

---

## Assistente avulso (`/api/assistente`) — autenticado

| Método | Rota                 | Corpo                                 | Descrição                                   |
| ------ | -------------------- | ------------------------------------- | ------------------------------------------- |
| POST   | `/perguntar`         | `{ pergunta, historico? }`            | Pergunta direta sem conversa salva          |
| POST   | `/analisar-arquivo`  | `multipart/form-data`: `file`         | Analisa arquivo e responde sobre o conteúdo |

---

## Petições (`/api/peticoes`) — autenticado

| Método | Rota           | Corpo                                                                          | Descrição                    |
| ------ | -------------- | ------------------------------------------------------------------------------ | ---------------------------- |
| GET    | ``             | query: `tipo?`, `page?`, `page_size?`                                         | Lista petições               |
| GET    | `/{id}`        | —                                                                              | Detalhe                      |
| POST   | ``             | `{ titulo, tipo?, conteudo?, processo_numero?, tribunal?, partes? }`          | Cria manual                  |
| PUT    | `/{id}`        | qualquer campo acima                                                          | Atualiza (ex.: edição)       |
| DELETE | `/{id}`        | —                                                                              | Exclui                       |
| POST   | `/gerar`       | `{ tipo, contexto, processo_numero?, tribunal?, cliente_nome?, cliente_documento?, partes? }` | Gera rascunho via IA |
| POST   | `/{id}/export` | query: `formato=word|pdf`                                                     | Exporta em DOCX ou PDF       |

`tipo`: `inicial | contestacao | agravo | apelacao | mandado_de_seguranca | contrato | procuracao | parecer | personalizado`.

---

## Pesquisa (`/api/pesquisa`) — autenticado

| Método | Rota            | Corpo                                   | Descrição                          |
| ------ | --------------- | --------------------------------------- | ---------------------------------- |
| POST   | `/ia`           | `{ termo, tribunal?, limite? }`         | Pesquisa por IA com fontes         |
| POST   | `/jurisprudencia` | `{ termo, tribunal?, limite? }`       | Jurisprudência                     |
| POST   | `/sumulas`      | `{ termo, tribunal?, limite? }`         | Súmulas                            |
| POST   | `/leis`         | `{ termo, limite? }`                    | Legislação                         |

Resultado de `/ia`:

```json
{
  "resposta": "…",
  "fontes": [{ "fonte": "…", "tipo": "lei", "trecho": "…", "score": 0.87, "url": "…" }],
  "precisa_revisao": true
}
```

---

## Agenda (`/api/agenda`) — autenticado

| Método | Rota    | Corpo                                                                       | Descrição        |
| ------ | ------- | --------------------------------------------------------------------------- | ---------------- |
| GET    | ``      | query: `inicio?`, `fim?`, `tipo?`, `page?`, `page_size?`                   | Lista eventos    |
| GET    | `/{id}` | —                                                                           | Detalhe          |
| POST   | ``      | `{ titulo, tipo?, descricao?, data_inicio, hora_inicio?, data_fim?, hora_fim?, local?, notificar?, concluido?, cliente_id?, processo_id? }` | Cria evento |
| PUT    | `/{id}` | qualquer campo acima                                                       | Atualiza         |
| DELETE | `/{id}` | —                                                                           | Exclui           |

`tipo`: `audiencia | compromisso | prazo | reuniao | outro`.

---

## Financeiro (`/api/financeiro`) — autenticado

| Método | Rota           | Corpo                                                                          | Descrição            |
| ------ | -------------- | ------------------------------------------------------------------------------ | -------------------- |
| GET    | ``             | query: `tipo?`, `categoria?`, `inicio?`, `fim?`, `page?`, `page_size?`        | Lista movimentos     |
| GET    | `/resumo`      | query: `inicio?`, `fim?`                                                       | Resumo consolidado   |
| POST   | ``             | `{ tipo, categoria?, descricao, valor, data, status?, observacoes?, cliente_id? }` | Registra movimento |
| PUT    | `/{id}`        | qualquer campo acima                                                          | Atualiza             |
| DELETE | `/{id}`        | —                                                                              | Exclui               |

`tipo`: `receita | despesa` · `categoria`: `honorarios | mensalidade | reembolso | despesa_operacional | custas | impostos | outros` · `status`: `pago | pendente`.

Resumo:

```json
{
  "receitas_total": 5000.0,
  "despesas_total": 1200.0,
  "saldo": 3800.0,
  "receitas_pendentes": 0.0,
  "despesas_pendentes": 200.0
}
```

---

## Dashboard (`/api/dashboard`) — autenticado

| Método | Rota | Descrição                                                                  |
| ------ | ---- | -------------------------------------------------------------------------- |
| GET    | ``   | Stats consolidados, petições/processos/clientes recentes, eventos próximos, atividades, gráficos de 6 meses |

Estrutura principal:

```json
{
  "stats": { "total_clientes": 0, "total_processos": 0, "processos_andamento": 0, "processos_prazo_proximo": 0, "total_consultas_ia": 0, "total_peticoes": 0, "total_documentos": 0, "eventos_hoje": 0, "receitas_mes": 0, "despesas_mes": 0 },
  "peticoes_recentes": [],
  "processos_recentes": [],
  "clientes_recentes": [],
  "conversas_recentes": [],
  "eventos_proximos": [],
  "atividades_recentes": [],
  "receitas_por_mes": [{ "rotulo": "mar", "valor": 0 }],
  "despesas_por_mes": []
}
```

---

## Configurações (`/api/settings`) — autenticado

| Método | Rota | Corpo                          | Descrição                     |
| ------ | ---- | ------------------------------ | ----------------------------- |
| GET    | ``   | —                              | Perfil + status do sistema    |
| PUT    | ``   | `{ plano?, preferencias?, avatar_url? }` | Atualiza preferências |

`GET /settings`:

```json
{
  "usuario": { "id": 1, "nome": "…", "email": "…", "plano": "free", "is_active": true },
  "sistema": { "ia_disponivel": true, "plano": "free" }
}
```

---

## Health (`/api/health`)

| Método | Rota    | Descrição                        |
| ------ | ------- | -------------------------------- |
| GET    | `/health` | Status do serviço (público)    |
