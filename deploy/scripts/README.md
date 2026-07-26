# Instalação e operação — AIC App (Docker)

Guia para administradores instalarem e atualizarem a aplicação **AIC — Administração de Igrejas Cristãs** em servidores com Docker.

## Requisitos mínimos

| Recurso | Recomendado |
|---------|-------------|
| CPU | 2 vCPU |
| RAM | **6 GB** no Docker Desktop (mínimo 4 GB) |
| Disco | 10 GB livres |
| Software | Docker 24+, Docker Compose v2, Git |
| Tempo 1ª instalação | ~15–30 min (build sequencial backend → frontend) |

- **Linux/macOS:** Bash 4+
- **Windows:** PowerShell 7+ e [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Instalação rápida

### Linux / macOS

```bash
git clone https://github.com/francissantiago/AIC_APP.git /opt/aic-app
cd /opt/aic-app
chmod +x deploy/scripts/aic-app.sh
./deploy/scripts/aic-app.sh install
```

Ou use o menu interativo:

```bash
./deploy/scripts/aic-app.sh
```

### Windows (PowerShell)

```powershell
git clone https://github.com/francissantiago/AIC_APP.git C:\aic-app
cd C:\aic-app
.\deploy\scripts\aic-app.ps1 -Action Install
```

O script irá:

1. Verificar Docker, Compose e Git.
2. Criar `deploy/.env` a partir do exemplo (com segredos aleatórios).
3. Perguntar porta HTTP e URL pública (CORS).
4. Construir imagens e subir MySQL, backend e nginx.
5. Executar migrations TypeORM automaticamente.

Após a instalação, acesse:

- **App:** `http://<servidor>:<porta>` (padrão porta 80)
- **Swagger:** `http://<servidor>:<porta>/docs`

## Atualização

Busca a versão mais recente no GitHub, rebuilda imagens, roda migrations e reinicia containers **preservando volumes** (banco e uploads).

```bash
./deploy/scripts/aic-app.sh update
```

```powershell
.\deploy\scripts\aic-app.ps1 -Action Update
```

Se já estiver na última versão, o script informa e encerra sem alterações.

## Comandos disponíveis

| Ação | Bash | PowerShell |
|------|------|------------|
| Instalar | `./deploy/scripts/aic-app.sh install` | `.\deploy\scripts\aic-app.ps1 -Action Install` |
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

## Configuração (`deploy/.env`)

Principais variáveis (veja `deploy/.env.example`):

| Variável | Descrição |
|----------|-----------|
| `APP_HTTP_PORT` | Porta HTTP exposta (padrão `80`) |
| `CORS_ORIGIN` / `FRONTEND_APP_URL` | URL pública do frontend |
| `JWT_SECRET` | Segredo para tokens JWT |
| `DB_*` | Credenciais MySQL |
| `GOOGLE_*` | Integração Google Calendar (opcional) |
| `GIT_REPO_URL` / `GIT_BRANCH` | Repositório e branch para updates |

**Nunca** commite `deploy/.env` — ele contém segredos.

## Backup do banco

```bash
docker compose --env-file deploy/.env exec mysql \
  mysqldump -u root -p"$DB_ROOT_PASSWORD" db_aic > backup-aic.sql
```

Substitua `db_aic` se alterou `DB_NAME`.

## Solução de problemas

| Sintoma | Ação |
|---------|------|
| Health check falha | `./deploy/scripts/aic-app.sh logs` e verifique migrations |
| Porta 80 ocupada | Altere `APP_HTTP_PORT` em `deploy/.env` e reinicie |
| Update com conflito Git | Resolva manualmente ou restaure backup; updates usam `--ff-only` |
| Google OAuth | Configure `GOOGLE_*` e URIs no Google Cloud Console |
| Build falha com `heap out of memory` ou `EOF` | Aumente a memória do Docker Desktop para **6 GB** (Settings → Resources). Reinicie o Docker Desktop e rode o install de novo — o script faz **build sequencial** (nunca Nest + Angular ao mesmo tempo) |
| Build parece “travado” > 1 h | Quase sempre o Docker Desktop reiniciou por falta de memória. Pare o build (`Ctrl+C`), aumente a RAM e rode `Install` novamente |

## Primeiro acesso

Após instalação limpa, use as credenciais definidas nas migrations/seeds do projeto ou crie o primeiro usuário conforme documentação interna da igreja. Consulte o administrador do sistema ou o time de desenvolvimento se não houver seed de admin automático.
