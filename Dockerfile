# ============================================================
# Dockerfile — Express + SQLite + Frontend
# ============================================================
# ARG CACHEBUST — cualquier cambio aquí invalida TODAS las capas de caché.
# Cambia el timestamp para forzar una build limpia.
ARG CACHEBUST=2026-09-13-security-sync

FROM node:22-alpine AS builder
ARG CACHEBUST
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine AS production
ARG CACHEBUST
WORKDIR /app

COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json
COPY --from=builder /app/server/ /app/server/
COPY --from=builder /app/dist/ /app/dist/

RUN npm ci --omit=dev --no-audit --no-fund

ENV HOST=0.0.0.0
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

CMD ["sh", "-c", "echo '🐾 v24 - Iniciando Express + SQLite' && exec node server/index.js"]
