# Frontend AIC — Angular

Interface web do **AIC — Administração de Igrejas Cristãs**.

## Stack

- Angular 21
- TypeScript
- Tailwind CSS
- ngx-translate (i18n)
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

## Idiomas (i18n)

Idiomas suportados via `@ngx-translate`:

| Código | Idioma | Observação |
|--------|--------|------------|
| `en` | Inglês | Padrão internacional (fallback) |
| `es` | Espanhol | Padrão internacional |
| `pt-BR` | Português do Brasil | — |

Arquivos de tradução em [`public/i18n/`](public/i18n/).  
A preferência fica em `localStorage` (`aic.lang`). Se não houver preferência salva, o app tenta o idioma do navegador e cai em `en`.

Uso em templates:

```html
{{ 'COMMON.SAVE' | translate }}
```

Troca de idioma: componente `app-language-switcher` ou `I18nService.setLanguage(...)`.

## API

O backend NestJS (pasta `../backend`) expõe a API em `http://localhost:3000`.  
Swagger: http://localhost:3000/docs  

CORS do backend está configurado para `http://localhost:4200` por padrão.
