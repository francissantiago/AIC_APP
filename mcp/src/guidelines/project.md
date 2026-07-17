# Guidelines — Projeto AIC

## Monorepo

```
AIC_APP/
├── frontend/   # Angular 21
├── backend/    # NestJS + MySQL
├── mcp/        # Servidor MCP (este pacote)
└── README.md
```

## Propósito

**AIC — Administração de Igrejas Cristãs**

## Princípios de estabilidade

1. **Padronizar antes de inventar** — use blueprints MCP e examples do repo
2. **Fonte de verdade do schema** — MySQL via tools de leitura; não inventar colunas
3. **i18n completo** — toda UI nova em `en` / `es` / `pt-BR`
4. **TypeORM sem synchronize** — schema muda só com migrations conscientes
5. **Checklist** — chame `check_pre_implementation` antes de features

## Fluxo recomendado do agente

1. `check_pre_implementation`
2. `get_project_guidelines` (topic adequado)
3. Blueprints (frontend/backend)
4. Schema/query se houver impacto em DB
5. `check_i18n_parity` se houver UI

## Idiomas

| Código | Idioma |
|--------|--------|
| `en` | Inglês (padrão / fallback) |
| `es` | Espanhol |
| `pt-BR` | Português do Brasil |
