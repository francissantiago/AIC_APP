#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

usage() {
  cat <<'EOF'
Uso: aic-app.sh [comando]

Comandos:
  install   Instala ou prepara a stack Docker
  update    Atualiza a partir do GitHub e reinicia containers
  install-from-source  Instala compilando localmente (ignora GitHub Release)
  status    Exibe status dos containers, versão Git e health
  stop      Para os containers
  start     Inicia os containers
  logs      Acompanha logs (tail -f)
  menu      Menu interativo (padrão)
EOF
}

run_action() {
  case "$1" in
    install) aic_action_install ;;
    install-from-source) AIC_BUILD_FROM_SOURCE=1 aic_action_install ;;
    update) aic_action_update ;;
    status) aic_action_status ;;
    stop) aic_action_stop ;;
    start) aic_action_start ;;
    logs) aic_action_logs ;;
    *)
      aic_die "Comando desconhecido: $1"
      ;;
  esac
}

if [[ $# -gt 0 && "${1}" != "menu" ]]; then
  run_action "$1"
  exit 0
fi

while true; do
  aic_print_menu
  read -r -p "Escolha uma opção: " choice
  case "${choice}" in
    1) aic_action_install ;;
    2) aic_action_update ;;
    3) aic_action_status ;;
    4) aic_action_stop ;;
    5) aic_action_start ;;
    6) aic_action_logs ;;
    0) exit 0 ;;
    *) aic_warn "Opção inválida." ;;
  esac
done
