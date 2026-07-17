# Guidelines — Frontend (AIC)

Fonte complementar: `frontend/.cursor/rules/cursor.mdc`

## Stack

- Angular 21 standalone (não declarar `standalone: true`)
- TypeScript strict
- Tailwind + SCSS de componente
- ngx-translate (`en`, `es`, `pt-BR`)

## Componentes

- Pasta: `frontend/src/app/components/<kebab-name>/`
- `ChangeDetectionStrategy.OnPush`
- `inject()` em vez de constructor DI
- Signals para estado local; `computed()` para derivados
- Reactive Forms (não template-driven)
- Control flow nativo: `@if`, `@for`, `@switch`
- Sem `ngClass` / `ngStyle` — usar bindings `class` / `style`
- Templates/styles com paths relativos ao `.ts`
- Textos de UI via `| translate`

## Serviços

- Pasta: `frontend/src/app/services/`
- `providedIn: 'root'`
- `inject(HttpClient)`
- Tipagem forte + interfaces em `frontend/src/app/interfaces/`
- Retry apenas para HTTP >= 500 (ver `example-service.ts`)

## Paths (schematics)

| Artefato | Pasta |
|----------|-------|
| component | `src/app/components` |
| service | `src/app/services` |
| interface | `src/app/interfaces` |
| enum | `src/app/enums` |
| guard | `src/app/guards` |
| interceptor | `src/app/interceptors` |
| pipe | `src/app/pipes` |
| resolver | `src/app/resolvers` |
| model | `src/app/models` |

## i18n

- Arquivos: `frontend/public/i18n/{en,es,pt-BR}.json`
- Manter paridade de chaves nos 3 idiomas
- Preferência do usuário em `localStorage` (`aic.lang`)

## Antes de implementar

1. `get_project_guidelines` (frontend / i18n)
2. `get_frontend_component_blueprint` e/ou `get_frontend_service_blueprint`
3. `check_i18n_parity` após adicionar chaves
