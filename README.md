# AIC App

Aplicação **AIC — Administração de Igrejas Cristãs**.

Monorepo com frontend Angular e backend NestJS.

## Estrutura

```
AIC_APP/
├── frontend/   # Angular 21 + Tailwind
├── backend/    # NestJS + MySQL (TypeORM)
└── README.md
```

## Pré-requisitos

- Node.js 20+
- npm
- MySQL (para o backend)

## Início rápido

### Backend

```bash
cd backend
cp .env.example .env
# ajuste DB_* no .env e garanta que o database exista (ex.: db_aic)
npm install
npm run start:dev
```

- API: http://localhost:3000/api/health  
- Swagger: http://localhost:3000/docs  

Detalhes em [backend/README.md](backend/README.md).

### Frontend

```bash
cd frontend
npm install
npm start
```

- App: http://localhost:4200  

Detalhes em [frontend/README.md](frontend/README.md).

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | Angular 21, TypeScript, Tailwind CSS, ngx-translate (en / es / pt-BR) |
| Backend | NestJS, TypeScript, MySQL, TypeORM, Swagger, Cron, WebSocket |
