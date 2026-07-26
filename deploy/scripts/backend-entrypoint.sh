#!/bin/sh
set -eu

DB_HOST="${DB_HOST:-mysql}"
DB_PORT="${DB_PORT:-3306}"

echo "[entrypoint] Aguardando MySQL em ${DB_HOST}:${DB_PORT}..."
until nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 2
done
echo "[entrypoint] MySQL disponível."

echo "[entrypoint] Executando migrations..."
npm run migration:run:prod

echo "[entrypoint] Iniciando API..."
exec node dist/main.js
