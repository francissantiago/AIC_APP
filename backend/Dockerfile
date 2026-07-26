# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

# Nest build consome bastante heap; evita OOM em Docker Desktop com memória limitada
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

FROM node:20-alpine AS production

RUN apk add --no-cache curl netcat-openbsd

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev \
  && npm install --no-save ts-node typescript tsconfig-paths

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/tsconfig.build.json ./tsconfig.build.json

COPY deploy/scripts/backend-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && mkdir -p /app/uploads \
  && chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:3000/api/health" || exit 1

ENTRYPOINT ["/entrypoint.sh"]
