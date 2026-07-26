#!/usr/bin/env bash
set -euo pipefail

aic_info() {
  printf '[INFO] %s\n' "$*"
}

aic_ok() {
  printf '[OK]   %s\n' "$*"
}

aic_warn() {
  printf '[WARN] %s\n' "$*" >&2
}

aic_die() {
  printf '[ERRO] %s\n' "$*" >&2
  exit 1
}

AIC_SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AIC_REPO_ROOT="$(cd "${AIC_SCRIPTS_DIR}/../.." && pwd)"

aic_resolve_install_dir() {
  if [[ -n "${INSTALL_DIR:-}" ]]; then
    echo "${INSTALL_DIR}"
    return
  fi

  if [[ -f "${AIC_SCRIPTS_DIR}/../.env" ]]; then
    local configured
    configured="$(grep -E '^INSTALL_DIR=' "${AIC_SCRIPTS_DIR}/../.env" | tail -n1 | cut -d= -f2- | tr -d '\r' || true)"
    if [[ -n "${configured}" ]]; then
      echo "${configured}"
      return
    fi
  fi

  echo "${AIC_REPO_ROOT}"
}

aic_require_command() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    aic_die "Comando obrigatório não encontrado: ${cmd}"
  fi
}

aic_require_prerequisites() {
  aic_require_command docker
  aic_require_command git
  if ! docker compose version >/dev/null 2>&1; then
    aic_die "Docker Compose v2 não encontrado. Instale Docker Desktop ou docker-compose-plugin."
  fi
}

aic_random_hex() {
  local bytes="${1:-32}"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "${bytes}"
    return
  fi
  node -e "console.log(require('crypto').randomBytes(${bytes}).toString('hex'))"
}

aic_set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  tmp="$(mktemp)"
  while IFS= read -r line || [[ -n "${line}" ]]; do
    if [[ "${line}" == "${key}="* ]]; then
      printf '%s=%s\n' "${key}" "${value}"
    else
      printf '%s\n' "${line}"
    fi
  done < "${file}" > "${tmp}"
  if ! grep -q "^${key}=" "${tmp}"; then
    printf '%s=%s\n' "${key}" "${value}" >> "${tmp}"
  fi
  mv "${tmp}" "${file}"
}

aic_ensure_env_file() {
  local env_file="${1}/deploy/.env"
  local example_file="${1}/deploy/.env.example"

  if [[ ! -f "${env_file}" ]]; then
    if [[ ! -f "${example_file}" ]]; then
      aic_die "Arquivo de exemplo não encontrado: ${example_file}"
    fi
    cp "${example_file}" "${env_file}"
    aic_info "Criado ${env_file} a partir do exemplo."
  fi

  echo "${env_file}"
}

aic_generate_secrets() {
  local env_file="$1"
  aic_set_env_value "${env_file}" "JWT_SECRET" "$(aic_random_hex 32)"
  aic_set_env_value "${env_file}" "DB_ROOT_PASSWORD" "$(aic_random_hex 16)"
  aic_set_env_value "${env_file}" "DB_PASSWORD" "$(aic_random_hex 16)"
}

aic_compose() {
  local install_dir="$1"
  shift
  # BuildKit + limite paralelo: evita OOM no Docker Desktop ao compilar Nest e Angular juntos
  DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 COMPOSE_PARALLEL_LIMIT=1 \
    docker compose --project-directory "${install_dir}" --env-file "${install_dir}/deploy/.env" "$@"
}

aic_compose_build_and_up() {
  local install_dir="$1"
  shift
  local pull_flag=()
  if [[ "${1:-}" == "--pull" ]]; then
    pull_flag=(--pull)
    shift
  fi

  aic_info "Build sequencial (mysql → backend → web) para reduzir uso de memória..."
  aic_compose "${install_dir}" pull mysql || true
  aic_compose "${install_dir}" build "${pull_flag[@]}" backend
  aic_compose "${install_dir}" build "${pull_flag[@]}" web
  aic_info "Iniciando containers..."
  aic_compose "${install_dir}" up -d
}

aic_load_env() {
  local env_file="$1"
  set -a
  # shellcheck disable=SC1090
  source "${env_file}"
  set +a
}

aic_wait_for_health() {
  local install_dir="$1"
  local port="${2:-80}"
  local attempts=60
  local i=0

  aic_info "Aguardando health check em http://localhost:${port}/api/health ..."
  while (( i < attempts )); do
    if curl -fsS "http://localhost:${port}/api/health" >/dev/null 2>&1; then
      aic_ok "Aplicação respondendo."
      return 0
    fi
    sleep 5
    ((i++))
  done

  aic_warn "Health check não confirmado dentro do tempo esperado. Verifique os logs."
  return 1
}

aic_show_summary() {
  local install_dir="$1"
  local env_file="${install_dir}/deploy/.env"
  aic_load_env "${env_file}"

  local port="${APP_HTTP_PORT:-80}"
  local sha
  sha="$(git -C "${install_dir}" rev-parse --short HEAD 2>/dev/null || echo 'n/a')"

  echo
  aic_ok "Deploy concluído."
  echo "  URL:        http://localhost:${port}"
  echo "  Swagger:    http://localhost:${port}/docs"
  echo "  Commit:     ${sha}"
  echo "  Logs:       ${AIC_SCRIPTS_DIR}/aic-app.sh logs"
  echo
}

aic_action_install() {
  aic_require_prerequisites

  local target_dir
  target_dir="$(aic_resolve_install_dir)"
  local repo_url branch

  if [[ -f "${target_dir}/deploy/.env" ]]; then
    aic_load_env "${target_dir}/deploy/.env"
  fi

  repo_url="${GIT_REPO_URL:-https://github.com/francissantiago/AIC_APP.git}"
  branch="${GIT_BRANCH:-main}"

  if [[ ! -d "${target_dir}/.git" ]]; then
    aic_info "Clonando ${repo_url} (branch ${branch}) em ${target_dir} ..."
    mkdir -p "${target_dir}"
    git clone --branch "${branch}" --depth 1 "${repo_url}" "${target_dir}"
  else
    aic_warn "Diretório Git já existe: ${target_dir}"
    read -r -p "Continuar instalação/atualização local? [s/N] " answer
    if [[ ! "${answer}" =~ ^[sS]$ ]]; then
      aic_die "Instalação cancelada."
    fi
  fi

  local env_file
  env_file="$(aic_ensure_env_file "${target_dir}")"

  if grep -q 'change-me' "${env_file}"; then
    aic_info "Gerando segredos aleatórios ..."
    aic_generate_secrets "${env_file}"
  fi

  aic_load_env "${env_file}"

  read -r -p "Porta HTTP [${APP_HTTP_PORT:-80}]: " input_port
  if [[ -n "${input_port}" ]]; then
    aic_set_env_value "${env_file}" "APP_HTTP_PORT" "${input_port}"
  fi

  read -r -p "CORS_ORIGIN [${CORS_ORIGIN:-http://localhost}]: " input_cors
  if [[ -n "${input_cors}" ]]; then
    aic_set_env_value "${env_file}" "CORS_ORIGIN" "${input_cors}"
    aic_set_env_value "${env_file}" "FRONTEND_APP_URL" "${input_cors}"
  fi

  aic_set_env_value "${env_file}" "INSTALL_DIR" "${target_dir}"
  aic_load_env "${env_file}"

  aic_compose_build_and_up "${target_dir}"

  aic_wait_for_health "${target_dir}" "${APP_HTTP_PORT:-80}" || true
  aic_show_summary "${target_dir}"
}

aic_action_update() {
  aic_require_prerequisites

  local target_dir
  target_dir="$(aic_resolve_install_dir)"

  if [[ ! -d "${target_dir}/.git" ]]; then
    aic_die "Diretório não é um repositório Git: ${target_dir}. Execute a instalação primeiro."
  fi

  local env_file
  env_file="$(aic_ensure_env_file "${target_dir}")"
  aic_load_env "${env_file}"

  local branch="${GIT_BRANCH:-main}"
  aic_info "Buscando atualizações (origin/${branch}) ..."
  git -C "${target_dir}" fetch origin "${branch}"

  local local_sha remote_sha
  local_sha="$(git -C "${target_dir}" rev-parse HEAD)"
  remote_sha="$(git -C "${target_dir}" rev-parse "origin/${branch}")"

  if [[ "${local_sha}" == "${remote_sha}" ]]; then
    aic_ok "Já está na versão mais recente (${local_sha:0:7})."
    return 0
  fi

  aic_info "Atualizando de ${local_sha:0:7} para ${remote_sha:0:7} ..."
  git -C "${target_dir}" pull --ff-only origin "${branch}"

  aic_compose_build_and_up "${target_dir}" --pull

  aic_wait_for_health "${target_dir}" "${APP_HTTP_PORT:-80}" || true
  aic_show_summary "${target_dir}"
}

aic_action_status() {
  local target_dir
  target_dir="$(aic_resolve_install_dir)"
  local env_file="${target_dir}/deploy/.env"

  if [[ ! -f "${env_file}" ]]; then
    aic_die "Arquivo ${env_file} não encontrado. Execute a instalação primeiro."
  fi

  aic_load_env "${env_file}"

  echo
  aic_info "Containers"
  aic_compose "${target_dir}" ps

  echo
  aic_info "Versão Git"
  if [[ -d "${target_dir}/.git" ]]; then
    git -C "${target_dir}" log -1 --oneline
  else
    echo "Repositório Git não encontrado."
  fi

  echo
  aic_info "Health"
  if curl -fsS "http://localhost:${APP_HTTP_PORT:-80}/api/health"; then
    echo
  else
    aic_warn "Health check falhou."
  fi
}

aic_action_stop() {
  local target_dir
  target_dir="$(aic_resolve_install_dir)"
  aic_compose "${target_dir}" stop
  aic_ok "Containers parados."
}

aic_action_start() {
  local target_dir
  target_dir="$(aic_resolve_install_dir)"
  aic_compose "${target_dir}" up -d
  aic_ok "Containers iniciados."
}

aic_action_logs() {
  local target_dir
  target_dir="$(aic_resolve_install_dir)"
  aic_compose "${target_dir}" logs -f --tail=200
}

aic_print_menu() {
  cat <<'MENU'

AIC App — Gerenciador Docker
  [1] Instalar
  [2] Atualizar
  [3] Status
  [4] Parar
  [5] Iniciar
  [6] Logs
  [0] Sair

MENU
}
