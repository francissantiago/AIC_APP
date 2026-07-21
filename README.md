# AIC App

Aplicação **AIC — Administração de Igrejas Cristãs**.

Monorepo com frontend Angular e backend NestJS.

## Estrutura

```
AIC_APP/
├── frontend/   # Angular 21 + Tailwind
├── backend/    # NestJS + MySQL (TypeORM)
├── mcp/        # Servidor MCP (Cursor)
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

### MCP (Cursor)

Servidor MCP na pasta [`mcp/`](mcp/) para queries MySQL (somente SELECT), blueprints Angular/Nest e guidelines do projeto.

```bash
cd mcp
cp .env.example .env   # ou reutilize backend/.env
npm install
```

Registro: [`.cursor/mcp.json`](.cursor/mcp.json). Detalhes em [mcp/README.md](mcp/README.md).

## Google Calendar (sincronização bilateral)

A agenda da secretaria (`/secretariat/agenda`) pode sincronizar eventos com um Google Calendar da congregação (OAuth2, push no CRUD + pull incremental a cada 15 min).

### 1. Google Cloud Console

1. Crie um projeto (ou use um existente) em [Google Cloud Console](https://console.cloud.google.com/).
2. Ative a **Google Calendar API**.
3. Em **APIs e serviços → Credenciais**, crie um **ID do cliente OAuth** do tipo **Aplicativo da Web**.
4. Em **URIs de redirecionamento autorizados**, adicione:
   ```
   http://localhost:3000/api/secretariat/google-calendar/oauth/callback
   ```
   Em produção, use a URL pública do backend com o mesmo path.
5. Configure a tela de consentimento OAuth (tipo Interno ou Externo conforme o caso) e publique/teste com usuários autorizados se necessário.

### 2. Variáveis no `backend/.env`

Copie de [`backend/.env.example`](backend/.env.example) e preencha:

```env
FRONTEND_APP_URL=http://localhost:4200
GOOGLE_OAUTH_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=seu-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/secretariat/google-calendar/oauth/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=
```

| Variável | Descrição |
|----------|-----------|
| `GOOGLE_OAUTH_CLIENT_ID` / `SECRET` | Credenciais do cliente OAuth Web |
| `GOOGLE_OAUTH_REDIRECT_URI` | Deve ser **idêntica** à URI cadastrada no Console |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Chave para cifrar tokens no MySQL (AES-256-GCM). Preferível: 64 caracteres hex (32 bytes) ou Base64 de 32 bytes. Em dev, qualquer string é derivada via SHA-256 |
| `FRONTEND_APP_URL` | Destino do redirect após o callback OAuth (ex.: `http://localhost:4200`) |

Gerar chave hex (64 chars) no terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Sem essas variáveis preenchidas, a API responde que a integração não está configurada (`SECRETARIAT_GOOGLE_CALENDAR_NOT_CONFIGURED`).

### 3. Migration

As tabelas `google_calendar_connections` e `google_calendar_event_links` vêm da migration TypeORM. Com o MySQL e o `.env` de DB ok:

```bash
cd backend
npm run migration:run
```

### 4. Uso na aplicação

1. Suba backend e frontend.
2. Entre com um usuário que tenha permissão `secretariat:write` na congregação ativa.
3. Abra **Secretaria → Agenda**.
4. Clique em **Conectar Google Agenda**, autorize no Google e aguarde o retorno em `/secretariat/agenda?googleCalendar=connected`.
5. Use **Sincronizar agora**, ajuste direção/política/calendário nas configurações ou aguarde o cron (a cada 15 minutos, timezone `APP_TIMEZONE`).

**Notas:**

- Há **uma conexão Google por congregação** (não por usuário).
- Tokens OAuth ficam criptografados no banco e **nunca** são expostos na API.
- Export/import **ICS** continua disponível para uso pontual com outros calendários; a sync Google é o vínculo contínuo.

### 5. Links para verificação OAuth no Google Cloud

A tela de consentimento OAuth exige URLs **públicas** (HTTPS em produção), acessíveis sem login:

| Campo no Console Google | Rota na AIC | Exemplo produção |
|-------------------------|-------------|------------------|
| Página inicial do app | `/home` | `https://SEU_DOMINIO/home` |
| Política de Privacidade | `/privacy` | `https://SEU_DOMINIO/privacy` |
| Termos de Serviço | `/terms` | `https://SEU_DOMINIO/terms` |

**Checklist antes de reenviar a verificação:**

1. Hospede o frontend em um **domínio próprio verificado** (não use Google Sites, Facebook, Instagram, etc.).
2. O **nome do app** na tela de consentimento deve ser exatamente: `AIC — Administração de Igrejas Cristãs` (igual ao H1 de `/home`).
3. A URL da Política de Privacidade na tela de consentimento deve ser **idêntica** ao link público `/privacy` (mesmo host e path).
4. Confirme que `/home` e `/privacy` abrem **sem login**.
5. Ícone/logo do app no Console **não** deve usar marcas ou ícones de produtos Google ([branding de APIs](https://about.google.com/brand-resource-center/guidance/apis/)).
6. Políticas de referência: [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy).

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | Angular 21, TypeScript, Tailwind CSS, ngx-translate (en / es / pt-BR) |
| Backend | NestJS, TypeScript, MySQL, TypeORM, Swagger, Cron, WebSocket |
| MCP | TypeScript, `@modelcontextprotocol/sdk`, mysql2 (SELECT-only) |
