# syntax=docker/dockerfile:1
# Empacota artefatos já compilados no host (dist/aic-app-frontend/browser).

FROM nginx:1.27-alpine AS production

RUN apk add --no-cache curl

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY frontend/dist/aic-app-frontend/browser /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS "http://127.0.0.1/" || exit 1

EXPOSE 80
