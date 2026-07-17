# Frontend AIC — Angular

Interface web do **AIC — Administração de Igrejas Cristãs**.

## Stack

- Angular 21
- TypeScript
- Tailwind CSS
- Vitest (testes)

## Pré-requisitos

- Node.js 20+
- npm

## Setup

```bash
cd frontend
npm install
npm start
```

A aplicação sobe em http://localhost:4200.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm start` | Servidor de desenvolvimento (`ng serve`) |
| `npm run build` | Build de produção |
| `npm run watch` | Build em watch (modo development) |
| `npm test` | Testes unitários |

## API

O backend NestJS (pasta `../backend`) expõe a API em `http://localhost:3000`.  
Swagger: http://localhost:3000/docs  

CORS do backend está configurado para `http://localhost:4200` por padrão.
