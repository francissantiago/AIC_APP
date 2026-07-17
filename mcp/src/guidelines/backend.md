# Guidelines — Backend (AIC)

## Stack

- NestJS 11 + TypeScript
- MySQL via TypeORM (`mysql2`)
- Swagger em `/docs`
- Cron: `@nestjs/schedule`
- WebSocket: Socket.IO namespace `/ws`
- Prefixo HTTP global: `/api`

## Módulos

- Um domínio por pasta em `backend/src/<kebab>/`
- Padrão: `*.module.ts` + `*.controller.ts` + `*.service.ts`
- Referência: `backend/src/health/`
- Documentar com `@ApiTags`, `@ApiOperation`, `@ApiOkResponse`
- Registrar o módulo em `app.module.ts`

## TypeORM

- `synchronize: false` (não alterar schema em runtime)
- Entities tipadas; colunas alinhadas ao MySQL real
- Antes de criar entity: `list_tables` / `get_table_schema` (MCP)
- Preferir migrations para mudanças de schema

## Config

- Variáveis em `.env` (`DB_*`, `PORT`, `CORS_ORIGIN`, `APP_TIMEZONE`)
- `ConfigModule` global + `TypeOrmModule.forRootAsync`

## Segurança / agentes

- MCP do projeto executa **somente SELECT** no banco
- Não expor senhas em tools/logs

## Antes de implementar

1. `get_project_guidelines` (backend)
2. `list_backend_modules` (não duplicar estrutura)
3. `get_nest_module_blueprint` / `get_nest_entity_blueprint`
4. Se tocar DB: `get_table_schema` + `run_select_query` (leitura)
