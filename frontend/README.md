# Frontend AIC — Angular

Interface web do **AIC — Administração de Igrejas Cristãs**.

## Stack

- Angular 21
- TypeScript
- Tailwind CSS
- ngx-translate (i18n)
- Vitest (testes)

## Módulos e Componentes

A interface é dividida em componentes funcionais (localizados em `src/app/components/`), refletindo os módulos de negócio do sistema:

- **Acesso e Perfil:** `auth`, `users`, `roles`, `profile`, `setup`
- **Gestão de Pessoas:** `members`, `families`, `membership-cards`
- **Administração:** `congregations`, `secretariat`, `finance`, `assets`
- **Atividades da Igreja:** `ebd` (Escola Bíblica), `small-groups` (Células), `ministries`, `missions`
- **Projetos:** `social-projects`, `constructions`
- **Comunicação e Painel:** `dashboard`, `announcements`, `notifications-bell`

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
| `npm start` | Servidor de desenvolvimento (`ng serve`, porta 4200) |
| `npm run dev` | Dev em `0.0.0.0:83` (acesso local/rede) |
| `npm run dev:remote` | Dev atrás de HTTPS reverse proxy (HMR off por padrão) |
| `npm run dev:no-hmr` | Igual ao `dev`, sem WebSocket/HMR |
| `npm run build` | Build de produção |
| `npm run watch` | Build em watch (modo development) |
| `npm test` | Testes unitários |

### HMR atrás de reverse proxy (HTTPS)

O Vite precisa de **WebSocket** para hot reload. O proxy de
`dev-application.lightburden.net` costuma encaminhar HTTP, mas **não** faz
upgrade WS — por isso `npm run dev:remote` desliga HMR por padrão (sem erro no
console; recarregue a página manualmente).

Para tentar HMR (só se o proxy tiver Upgrade/Connection):

```bash
AIC_ENABLE_HMR=1 npm run dev:remote
```

Exemplo Nginx com WebSocket:

```nginx
location / {
  proxy_pass http://127.0.0.1:83;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Variáveis opcionais (`dev:remote`):

| Variável | Padrão | Uso |
|----------|--------|-----|
| `AIC_ENABLE_HMR` | off | `1` / `true` liga HMR via `wss` |
| `AIC_DEV_PUBLIC_HOST` | `dev-application.lightburden.net` | Host público do HMR |
| `AIC_HMR_PROTOCOL` | `wss` | Protocolo do cliente |
| `AIC_HMR_CLIENT_PORT` | `443` | Porta vista pelo browser |

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
