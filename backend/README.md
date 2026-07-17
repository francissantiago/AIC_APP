# Backend AIC — NestJS

Scaffold da API do **AIC — Administração de Igrejas Cristãs**.

## Stack

- NestJS + TypeScript
- MySQL (TypeORM)
- Swagger (`/docs`)
- Cron (`@nestjs/schedule`)
- WebSocket (Socket.IO, namespace `/ws`)

## Pré-requisitos

- Node.js 20+
- MySQL com um database criado (ex.: `db_aic`)

## Setup

```bash
cd backend
cp .env.example .env
# ajuste DB_* e demais variáveis no .env
npm install
npm run start:dev
```

## URLs

| Recurso | URL |
|---------|-----|
| Health | http://localhost:3000/api/health |
| Swagger | http://localhost:3000/docs |
| WebSocket | namespace `/ws` (mesmo host/porta HTTP) |

## WebSocket (ping/pong)

Conecte com Socket.IO no namespace `/ws` e emita o evento `ping`. A API responde com `pong`.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run start:dev` | Desenvolvimento com watch |
| `npm run build` | Compila para `dist/` |
| `npm run start:prod` | Sobe a build de produção |
| `npm test` | Testes unitários |

## Variáveis de ambiente

Veja [`.env.example`](.env.example): `PORT`, `DB_*`, `CORS_ORIGIN`, `APP_TIMEZONE`.
