# MCP Server — AIC App

Servidor MCP (stdio) para agentes Cursor manterem padronização do monorepo AIC.

## Capacidades

- MySQL **somente-SELECT** (e SHOW / DESCRIBE / EXPLAIN)
- Blueprints Angular (component + service) alinhados aos examples
- Blueprints NestJS (module + entity)
- Guidelines, checklist pré-implementação, paridade i18n, validação de paths

## Setup

```bash
cd mcp
cp .env.example .env
# ou reutilize as mesmas DB_* do backend/.env
npm install
```

O servidor também carrega `backend/.env` automaticamente se `mcp/.env` não existir.

## Rodar (manual)

```bash
npm start
```

## Registro no Cursor

Arquivo do projeto: [`.cursor/mcp.json`](../.cursor/mcp.json)

Reinicie o MCP / Cursor após o primeiro setup para listar as tools `aic-app`.

## Tools

### Banco

| Tool | Descrição |
|------|-----------|
| `get_connection_info` | Host/porta/database (sem senha) |
| `list_tables` | Lista tabelas |
| `get_table_schema` | Colunas/tipos/chaves |
| `get_table_relations` | Foreign keys |
| `run_select_query` | Executa SQL de leitura |
| `explain_query` | EXPLAIN de SELECT |

### Blueprints

| Tool | Descrição |
|------|-----------|
| `get_frontend_component_blueprint` | Scaffold componente Angular |
| `get_frontend_service_blueprint` | Scaffold service + interfaces |
| `get_nest_module_blueprint` | Module + controller + service |
| `get_nest_entity_blueprint` | Entity TypeORM stub |

### Qualidade / guidelines

| Tool | Descrição |
|------|-----------|
| `get_project_guidelines` | frontend \| backend \| project \| i18n |
| `check_pre_implementation` | Checklist antes de feature |
| `list_backend_modules` | Módulos Nest existentes |
| `list_frontend_routes` | Conteúdo de `app.routes.ts` |
| `check_i18n_parity` | Chaves faltantes en/es/pt-BR |
| `get_i18n_key_template` | Template JSON de namespace |
| `validate_path_conventions` | Paths canônicos FE/BE |

## Segurança

Escrita no banco (**INSERT/UPDATE/DELETE/DDL**) é **rejeitada** pelo `select-guard`.
