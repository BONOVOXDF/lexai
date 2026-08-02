# LEX AI — Modelo de Dados

Banco padrão: **PostgreSQL** (produção) com fallback automático para
**SQLite** em desenvolvimento (`app/database/session.py`). ORM:
SQLAlchemy 2.0 (`Mapped` / `mapped_column`, modo declarativo).

Todas as tabelas possuem `created_at` e `updated_at`
(`TimestampMixin` em `app/database/base.py`).

---

## Diagrama de relacionamentos

```
users 1 ── N clientes 1 ── N processos 1 ── N documentos
  │            │                │
  │            └── N documentos │
  │                             ├─ N agenda (eventos)
  │                             └─ N documentos
  ├─ N conversas 1 ── N mensagens
  ├─ N peticoes
  └─ N financeiro (movimentos)
```

Todo recurso pertence a um **`user_id`** (multi-tenant por conta).

---

## `users` — usuários da plataforma

| Coluna          | Tipo            | Restrição            | Descrição                       |
| --------------- | --------------- | -------------------- | ------------------------------- |
| `id`            | Integer         | PK, index            |                                 |
| `nome`          | String(255)     | NOT NULL             |                                 |
| `email`         | String(255)     | UNIQUE, index        | Login                           |
| `senha_hash`    | String(255)     | NOT NULL             | Hash bcrypt                     |
| `telefone`      | String(30)      | NULL                 |                                 |
| `oab`           | String(30)      | NULL                 | Registro OAB                    |
| `plano`         | String(30)      | default `"free"`     | Plano de assinatura             |
| `is_active`     | Boolean         | default `true`       |                                 |
| `is_superuser`  | Boolean         | default `false`      |                                 |
| `avatar_url`    | String(500)     | NULL                 |                                 |
| `supabase_id`   | String(255)     | NULL, index          | ID para login social            |
| `preferencias`  | Text            | NULL                 | JSON de preferências            |

---

## `clientes` — clientes do escritório

| Coluna       | Tipo          | Restrição        | Descrição                    |
| ------------ | ------------- | ---------------- | ---------------------------- |
| `id`         | Integer       | PK, index        |                              |
| `user_id`    | Integer       | FK `users.id`    |                              |
| `nome`       | String(255)   | NOT NULL         |                              |
| `cpf`        | String(14)    | NULL, index      |                              |
| `cnpj`       | String(18)    | NULL             |                              |
| `telefone`   | String(30)    | NULL             |                              |
| `email`      | String(255)   | NULL             |                              |
| `endereco`   | String(500)   | NULL             |                              |
| `tipo`       | String(20)    | default `"pessoa_fisica"` |                     |
| `anotacoes`  | Text          | NULL             |                              |

---

## `processos` — processos judiciais

| Coluna         | Tipo             | Restrição          | Descrição               |
| -------------- | ---------------- | ------------------ | ----------------------- |
| `id`           | Integer          | PK, index          |                         |
| `user_id`      | Integer          | FK `users.id`      |                         |
| `cliente_id`   | Integer          | FK `clientes.id`, NULL |                     |
| `numero`       | String(50)       | NOT NULL, index    | Número do processo      |
| `tribunal`     | String(120)      | NULL               |                         |
| `classe`       | String(120)      | NULL               |                         |
| `vara`         | String(120)      | NULL               |                         |
| `comarca`      | String(120)      | NULL               |                         |
| `advogado`     | String(255)      | NULL               |                         |
| `status`       | Enum             | default `em_andamento` | `em_andamento\|arquivado\|suspenso\|concluido\|distribuido` |
| `prazo`        | Date             | NULL               | Próximo prazo           |
| `observacoes`  | Text             | NULL               |                         |
| `valor_causa`  | Float            | NULL               |                         |

---

## `documentos` — arquivos indexados

| Coluna            | Tipo          | Restrição          | Descrição                         |
| ----------------- | ------------- | ------------------ | --------------------------------- |
| `id`              | Integer       | PK, index          |                                   |
| `user_id`         | Integer       | FK `users.id`      |                                   |
| `processo_id`     | Integer       | FK `processos.id`, NULL |                                |
| `cliente_id`      | Integer       | FK `clientes.id`, NULL |                                |
| `nome_original`   | String(500)   | NOT NULL           |                                   |
| `caminho_arquivo` | String(1000)  | NOT NULL           | Caminho no disco/armazenamento    |
| `tipo`            | Enum          | NOT NULL           | `pdf\|docx\|imagem\|texto\|pptx`  |
| `tamanho_bytes`   | Integer       | default `0`        |                                   |
| `mime_type`       | String(120)   | NULL               |                                   |
| `conteudo_texto`  | Text          | NULL               | Texto extraído (para busca)       |
| `resumo`          | Text          | NULL               | Resumo gerado por IA              |
| `status`          | String(30)    | default `"pronto"` | `processando\|pronto`             |
| `is_indexed`      | Boolean       | default `false`    | Se está no banco vetorial         |

---

## `conversas` e `mensagens` — Assistente IA

### `conversas`
| Coluna         | Tipo        | Restrição            | Descrição          |
| -------------- | ----------- | -------------------- | ------------------ |
| `id`           | Integer     | PK, index            |                    |
| `user_id`      | Integer     | FK `users.id`        |                    |
| `titulo`       | String(300) | default `"Nova conversa"` |               |
| `is_favorita`  | Boolean     | default `false`      |                    |

### `mensagens`
| Coluna             | Tipo      | Restrição            | Descrição                            |
| ------------------ | --------- | -------------------- | ------------------------------------ |
| `id`               | Integer   | PK, index            |                                      |
| `conversa_id`      | Integer   | FK `conversas.id`    |                                      |
| `tipo`             | Enum      | NOT NULL             | `usuario\|assistente`                |
| `conteudo`         | Text      | NOT NULL             |                                      |
| `fontes`           | Text      | NULL                 | JSON serializado com as fontes (RAG) |
| `precisa_revisao`  | Boolean   | default `false`      | Resposta gerada por IA requer revisão|

---

## `peticoes` — petições e documentos jurídicos

| Coluna            | Tipo          | Restrição          | Descrição                     |
| ----------------- | ------------- | ------------------ | ----------------------------- |
| `id`              | Integer       | PK, index          |                               |
| `user_id`         | Integer       | FK `users.id`      |                               |
| `titulo`          | String(300)   | NOT NULL           |                               |
| `tipo`            | Enum          | default `personalizado` | `inicial\|contestacao\|agravo\|apelacao\|mandado_de_seguranca\|contrato\|procuracao\|parecer\|personalizado` |
| `conteudo`        | Text          | default `""`       | Markdown da peça              |
| `processo_numero` | String(50)    | NULL               |                               |
| `tribunal`        | String(120)   | NULL               |                               |
| `partes`          | Text          | NULL               |                               |

---

## `agenda` — eventos e prazos

| Coluna        | Tipo        | Restrição          | Descrição                     |
| ------------- | ----------- | ------------------ | ----------------------------- |
| `id`          | Integer     | PK, index          |                               |
| `user_id`     | Integer     | FK `users.id`      |                               |
| `cliente_id`  | Integer     | FK `clientes.id`, NULL |                           |
| `processo_id` | Integer     | FK `processos.id`, NULL |                           |
| `titulo`      | String(300) | NOT NULL           |                               |
| `tipo`        | Enum        | default `outro`    | `audiencia\|compromisso\|prazo\|reuniao\|outro` |
| `descricao`   | Text        | NULL               |                               |
| `data_inicio` | Date        | NOT NULL, index    |                               |
| `hora_inicio` | String(8)   | NULL               | `HH:MM`                       |
| `data_fim`    | Date        | NULL               |                               |
| `hora_fim`    | String(8)   | NULL               |                               |
| `local`       | String(300) | NULL               |                               |
| `notificar`   | Boolean     | default `true`     |                               |
| `concluido`   | Boolean     | default `false`    |                               |

---

## `financeiro` — movimentação financeira

| Coluna       | Tipo        | Restrição             | Descrição                             |
| ------------ | ----------- | --------------------- | ------------------------------------- |
| `id`         | Integer     | PK, index             |                                       |
| `user_id`    | Integer     | FK `users.id`         |                                       |
| `cliente_id` | Integer     | FK `clientes.id`, NULL |                                      |
| `tipo`       | Enum        | NOT NULL              | `receita\|despesa`                    |
| `categoria`  | Enum        | default `outros`      | `honorarios\|mensalidade\|reembolso\|despesa_operacional\|custas\|impostos\|outros` |
| `descricao`  | String(500) | NOT NULL              |                                       |
| `valor`      | Float       | NOT NULL              | Sempre positivo (> 0)                 |
| `data`       | Date        | NOT NULL, index       |                                       |
| `status`     | String(30)  | default `"pago"`      | `pago\|pendente`                      |
| `observacoes`| Text        | NULL                  |                                       |

---

## Migrações

- O projeto usa `Base.metadata.create_all` na inicialização
  (`app/database/session.py` / lifespan do `main.py`) — ideal para MVP.
- Para produção, recomenda-se **Alembic** para versionamento de schema.
- Banco vetorial (Qdrant/ChromaDB) é **separado** do banco relacional;
  os vetores são associados ao `documento_id` e `user_id` via payload
  (isolamento por usuário).

## Integridade

- `ON DELETE CASCADE` entre `users → *` (relacionamentos com
  `cascade="all, delete-orphan"`).
- Exclusão de documento remove arquivo, texto e vetores (LGPD).
