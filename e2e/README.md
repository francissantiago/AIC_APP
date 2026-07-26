# AIC — Testes E2E (Playwright)

Suite end-to-end da aplicação AIC: smoke CI, módulos CRUD, permissões ACL, **tutorials filmáveis por funcionalidade** e roteiro demo legado.

## Pré-requisitos

- Node.js 20+
- Backend rodando (`backend`, porta **3002**)
- Frontend rodando (`frontend`, porta **83** via `npm run dev`)
- Usuário admin com 2FA **desabilitado**

## Setup

```bash
cd e2e
cp .env.e2e.example .env.e2e
# Preencher E2E_ADMIN_PASSWORD no .env.e2e
npm install
```

O `postinstall` instala o Chromium do Playwright.

## Variáveis de ambiente (`.env.e2e`)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `E2E_BASE_URL` | URL do frontend | `http://localhost:83` |
| `E2E_API_URL` | URL da API (cleanup/seed) | `http://localhost:3002/api` |
| `E2E_ADMIN_EMAIL` | E-mail admin | `admin@admin.com` |
| `E2E_ADMIN_PASSWORD` | Senha admin | *(obrigatório)* |
| `E2E_SLOW_MO_MS` | Delay entre ações (demo legado) | `300` |
| `E2E_TUTORIAL_SLOW_MO_MS` | Delay entre ações nos tutorials | `900` |
| `E2E_TUTORIAL_PRE_STEP_PAUSE_MS` | Pausa antes de cada passo tutorial | `1500` |
| `E2E_TUTORIAL_PAUSE_MS` | Pausa após cada passo tutorial | `2800` |
| `E2E_TUTORIAL_INTRO_PAUSE_MS` | Pausa inicial antes do tutorial | `2000` |
| `E2E_TUTORIAL_HIGHLIGHT_MS` | Destaque do alvo antes de clicar/preencher | `1400` |
| `E2E_TUTORIAL_CURSOR_MOVE_MS` | Animação do cursor tutorial até o alvo | `450` |

## Comandos

```bash
# Smoke + módulos (projeto chromium, auth via storageState)
npm run test:e2e

# Tutorials — 1 spec = 1 funcionalidade = 1 vídeo .webm
npm run test:e2e:tutorials

# Gravar tutorials e publicar vídeos + manifest em frontend/public/help-videos/
npm run test:e2e:tutorials:publish

# Apenas republicar vídeos do último run (sem reexecutar testes)
npm run publish:tutorial-videos

# Demo comercial monolítico (legado)
npm run test:e2e:demo

# Modo interativo
npm run test:e2e:ui

# Abrir relatório HTML
npm run test:e2e:report
```

## Estrutura

```
e2e/
├── catalog/
│   ├── features.json              # catálogo mestre (IDs, fases, rotas)
│   └── help-videos.manifest.json  # gerado após publish
├── fixtures/          # auth, tutorial
├── helpers/           # ApiClient, dados E2E, publish de vídeos
├── pages/             # Page objects por módulo
├── public/help-videos/ # destino local dos .webm publicados
├── scripts/           # publish-tutorial-videos.ts
├── tests/
│   ├── smoke/         # specs CI (~≤10 min)
│   ├── modules/       # CRUD por domínio
│   ├── permissions/   # ACL read-only
│   ├── tutorials/     # 1 teste por featureId → vídeo separado
│   └── demo/          # full-walkthrough.spec.ts (legado)
└── test-results/      # gitignored — vídeos brutos, traces, HTML report
```

## Roteiro progressivo (fases)

| Fase | Escopo | Status |
|------|--------|--------|
| **0** | Infra: catalog, fixture, publish, manifest | ✅ |
| **1** | Núcleo: login, dashboard, avisos, pessoas, governança, perfil | ✅ tutorials |
| **2** | Organização: EBD, células, congregação, carteirinhas | parcial |
| **3** | Finanças e patrimônio | planned |
| **4** | Secretaria | planned |
| **5** | Projetos sociais, missões, obras | ✅ tutorials + modules |
| **6** | Público, notificações, ACL | planned |

Consulte `catalog/features.json` para o catálogo completo com `featureId`, rota e arquivo de teste.

## Tutorials — vídeos por funcionalidade

Cada arquivo `tests/tutorials/{featureId}.tutorial.spec.ts` contém **um único teste** que:

1. Executa fluxo curto e legível (dados `TUTORIAL-*`).
2. Grava vídeo `.webm` (1440×900, slowMo ~900 ms + pausas entre passos).
3. Antes de cada clique/preenchimento, injeta **cursor tutorial** e **destaque pulsante** no elemento alvo (automático via `tutorial.fixture`).
4. Após `npm run test:e2e:tutorials:publish`, o script copia para:
   - `e2e/public/help-videos/{featureId}.webm`
   - `frontend/public/help-videos/{featureId}.webm` (com `--copy-to-frontend`)
   - Gera `help-videos.manifest.json` para uso futuro na UI de ajuda.

**Contrato futuro (UI):** botão por view abrirá modal com vídeo mapeado via `featureId` no manifest.

## Demo comercial (legado)

O spec `tests/demo/full-walkthrough.spec.ts` grava **um vídeo monolítico** com 10 capítulos. Preferir `test:e2e:tutorials` para tutoriais modulares.

## Dados de teste

Registros criados usam prefixos `E2E-*`, `TUTORIAL-*` ou `DEMO-*` e são removidos via `ApiClient.asAdmin()` nos hooks de cleanup.

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `E2E_ADMIN_PASSWORD não configurado` | Preencher `.env.e2e` |
| Timeout na agenda | Usar vista **Dia** (já no page object) |
| Porta errada | Frontend deve estar em **83** (`npm run dev`) |
| Vídeo não publicado | Verificar `test-results/artifacts/**/video.webm` e rodar `publish:tutorial-videos` |
| Tutorial falhou no meio | Reexecutar `npm run test:e2e:tutorials` (retries=1) |
