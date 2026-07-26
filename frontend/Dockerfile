# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

# Build sequencial no script de install — um serviço por vez no Docker Desktop
ENV NODE_OPTIONS="--max-old-space-size=3072"

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
# postinstall aplica patches de dev (Vitest/HMR) — desnecessário na imagem de produção
RUN --mount=type=cache,target=/root/.npm \
  npm ci --ignore-scripts

COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine AS production

RUN apk add --no-cache curl

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/aic-app-frontend/browser /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS "http://127.0.0.1/" || exit 1

EXPOSE 80
