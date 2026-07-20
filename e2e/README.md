# AIC — Testes E2E (Playwright)

Suite end-to-end da aplicação AIC: smoke CI, módulos CRUD, permissões ACL e roteiro demo filmável.

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
| `E2E_SLOW_MO_MS` | Delay entre ações no demo | `300` |

### Staging (gravação remota)

Descomente no `.env.e2e`:

```
E2E_BASE_URL=https://dev-application.lightburden.net
E2E_API_URL=https://dev-application.lightburden.net/api
```

Confirme manualmente que o admin tem permissões completas antes de gravar o demo.

## Comandos

```bash
# Smoke + módulos (projeto chromium, auth via storageState)
npm run test:e2e

# Roteiro comercial com vídeo .webm (projeto demo, login UI)
npm run test:e2e:demo

# Modo interativo
npm run test:e2e:ui

# Abrir relatório HTML
npm run test:e2e:report
```

## Estrutura

```
e2e/
├── fixtures/          # auth, arquivos de upload
├── helpers/           # ApiClient, dados E2E, cleanup demo
├── pages/             # Page objects por módulo
├── tests/
│   ├── smoke/         # 7 specs CI (~≤10 min)
│   ├── modules/       # CRUD por domínio
│   ├── permissions/   # ACL read-only
│   └── demo/          # full-walkthrough.spec.ts (10 capítulos)
└── test-results/      # gitignored — vídeos, traces, HTML report
```

## Demo comercial

O spec `tests/demo/full-walkthrough.spec.ts` executa **um único teste serial** com 10 `test.step`:

1. Intro (login + shell)
2. Comunicação (avisos)
3. Pessoas (membros, famílias, aniversários)
4. Organização (ministérios, EBD, células)
5. Congregação (sede + filial)
6. Finanças (dashboard, dízimo, patrimônio, relatórios)
7. Secretaria (agenda, visitantes, presença, documentos, escalas)
8. Governança (usuários, papéis)
9. Perfil (nome revertido)
10. Logout

- **Vídeo:** `test-results/artifacts/` (`.webm`, viewport 1440×900, slowMo 300 ms)
- **Cleanup:** batch no `afterAll` via API (`E2E-*` / `DEMO-*`)
- **Duração:** ~15–45 min local; timeout configurado em 60 min

## Dados de teste

Registros criados usam prefixos `E2E-*` ou `DEMO-*` e são removidos via `ApiClient.asAdmin()` nos hooks de cleanup ou no final do demo.

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `E2E_ADMIN_PASSWORD não configurado` | Preencher `.env.e2e` |
| Timeout na agenda | Usar vista **Dia** (já no page object) |
| Porta errada | Frontend deve estar em **83** (`npm run dev`) |
| Demo falhou no meio | Reexecutar `npm run test:e2e:demo` (retries=1) |
