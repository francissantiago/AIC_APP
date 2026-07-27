# Instalação e operação — AIC App (Docker)

Guia para administradores instalarem e atualizarem a aplicação **AIC — Administração de Igrejas Cristãs** em servidores com Docker.

## Requisitos mínimos

| Recurso | Recomendado |
|---------|-------------|
| CPU | 2 vCPU |
| RAM | 4 GB no Docker Desktop |
| Disco | 10 GB livres |
| Software | Docker 24+, Docker Compose v2, Git |
| Tempo 1ª instalação | **~3–8 min** com GitHub Release (padrão); compilação local demora mais |

- **Linux/macOS:** Bash 4+
- **Windows:** PowerShell 7+ e [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Instalação rápida (GitHub Release — recomendado)

Por padrão (`AIC_USE_RELEASE=1`), o script **baixa artefatos pré-compilados** da [GitHub Release](https://github.com/francissantiago/AIC_APP/releases/latest) e só empacota as imagens Docker. **Node.js no host não é necessário.**

### Linux / macOS

```bash
git clone https://github.com/francissantiago/AIC_APP.git /opt/aic-app
cd /opt/aic-app
chmod +x deploy/scripts/aic-app.sh
./deploy/scripts/aic-app.sh install
```

### Windows (PowerShell)

```powershell
git clone https://github.com/francissantiago/AIC_APP.git C:\aic-app
cd C:\aic-app
.\deploy\scripts\aic-app.ps1 -Action Install
```

O script irá:

1. Verificar Docker, Compose e Git.
2. Criar `deploy/.env` e `deploy/app-config.json` a partir dos exemplos.
3. Baixar `aic-backend-*.tar.gz` e `aic-frontend-*.tar.gz` da release latest.
4. Empacotar imagens Docker e subir MySQL, backend e nginx.
5. Executar migrations TypeORM automaticamente.

Após a instalação:

- **App:** `http://<servidor>:<porta>`
- **Swagger:** `http://<servidor>:<porta>/docs`

## Releases (CI)

Cada tag `v*` (ex.: `v1.0.2`) dispara o workflow `.github/workflows/release.yml`, que publica:

| Asset | Conteúdo |
|-------|----------|
| `aic-backend-v1.0.2.tar.gz` | `dist/` + `package.json` |
| `aic-frontend-v1.0.2.tar.gz` | SPA estática (`browser/`) |
| `SHA256SUMS` | checksums |

Para publicar uma versão:

```bash
git tag v1.0.2
git push origin v1.0.2
```

## Atualização

Busca a release latest, extrai artefatos, rebuilda imagens e reinicia containers **preservando volumes**.

```bash
./deploy/scripts/aic-app.sh update
```

```powershell
.\deploy\scripts\aic-app.ps1 -Action Update
```

## Compilar localmente (fallback)

Se não houver release ou quiser build from source:

```bash
AIC_USE_RELEASE=0 ./deploy/scripts/aic-app.sh install
# ou
./deploy/scripts/aic-app.sh install-from-source
```

```powershell
.\deploy\scripts\aic-app.ps1 -Action Install -FromSource
```

Ordem de fallback automático: **Release → Node no host → Docker full build**.

## Comandos disponíveis

| Ação | Bash | PowerShell |
|------|------|------------|
| Instalar (release) | `./deploy/scripts/aic-app.sh install` | `.\deploy\scripts\aic-app.ps1 -Action Install` |
| Instalar (source) | `./deploy/scripts/aic-app.sh install-from-source` | `.\deploy\scripts\aic-app.ps1 -Action Install -FromSource` |
| Atualizar | `./deploy/scripts/aic-app.sh update` | `.\deploy\scripts\aic-app.ps1 -Action Update` |
| Status | `./deploy/scripts/aic-app.sh status` | `.\deploy\scripts\aic-app.ps1 -Action Status` |
| Parar | `./deploy/scripts/aic-app.sh stop` | `.\deploy\scripts\aic-app.ps1 -Action Stop` |
| Iniciar | `./deploy/scripts/aic-app.sh start` | `.\deploy\scripts\aic-app.ps1 -Action Start` |
| Logs | `./deploy/scripts/aic-app.sh logs` | `.\deploy\scripts\aic-app.ps1 -Action Logs` |

## Arquitetura

```
Browser → nginx (web) → Angular SPA
                      → /api, /socket.io → NestJS (backend) → MySQL
```

Volumes persistentes:

- `aic_mysql_data` — dados do banco
- `aic_uploads` — arquivos enviados pela aplicação

## Configuração

### Backend — `deploy/.env`

| Variável | Descrição |
|----------|-----------|
| `APP_HTTP_PORT` | Porta HTTP exposta (padrão `80`) |
| `CORS_ORIGIN` / `FRONTEND_APP_URL` | URL pública do frontend |
| `JWT_SECRET` | Segredo para tokens JWT |
| `DB_*` | Credenciais MySQL |
| `GOOGLE_*` | Integração Google Calendar (opcional) |
| `AIC_USE_RELEASE` | `1` = baixar release (padrão); `0` = compilar localmente |

**Nunca** commite `deploy/.env`.

### Frontend — `deploy/app-config.json`

Endpoints carregados em **runtime** (sem rebuild). Montado no container nginx:

```json
{
  "apiUrl": "/api",
  "wsUrl": "",
  "versionCheckIntervalMs": 300000
}
```

| Campo | Descrição |
|-------|-----------|
| `apiUrl` | Base da API (`/api` no Docker same-origin) |
| `wsUrl` | Origem Socket.IO; `""` = same-origin |
| `versionCheckIntervalMs` | Polling de nova versão; `0` = desabilitado |

API em outro domínio:

```json
{
  "apiUrl": "https://api.minhaigreja.org/api",
  "wsUrl": "https://api.minhaigreja.org",
  "versionCheckIntervalMs": 300000
}
```

Após editar, reinicie só o container web:

```bash
docker compose --env-file deploy/.env restart web
```

**Nunca** commite `deploy/app-config.json` — use `deploy/app-config.example.json` como template.

## Backup do banco

```bash
docker compose --env-file deploy/.env exec mysql \
  mysqldump -u root -p"$DB_ROOT_PASSWORD" db_aic > backup-aic.sql
```

## Solução de problemas

| Sintoma | Ação |
|---------|------|
| Release não encontrada | Publique uma tag `v*` ou use `install-from-source` |
| Health check falha | `./deploy/scripts/aic-app.sh logs` |
| Porta ocupada | Altere `APP_HTTP_PORT` em `deploy/.env` |
| Build local lento/travado | Use instalação via release (`AIC_USE_RELEASE=1`) |
| CORS com API externa | Ajuste `CORS_ORIGIN` no `.env` e `apiUrl` no `app-config.json` |

## Primeiro acesso

Após instalação limpa, use as credenciais definidas nas migrations/seeds do projeto ou crie o primeiro usuário conforme documentação interna da igreja.
