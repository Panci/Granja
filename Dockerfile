# ============================================================
# Dockerfile v24 - Express + SQLite + Frontend
# Build: 2026-08-06 v24 — tema día/noche (theme toggle) + BD SQLite.
# ============================================================
# ARG CACHEBUST — cualquier cambio aquí invalida TODAS las capas de caché.
# Cambia el timestamp para forzar una build limpia.
ARG CACHEBUST=2026-08-06-v24

FROM node:22-alpine AS builder
ARG CACHEBUST
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine AS production
ARG CACHEBUST
WORKDIR /app

COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/server/ /app/server/
COPY --from=builder /app/dist/ /app/dist/

# Instalar dependencias de producción (Express + CORS + SQLite)
RUN npm install --omit=dev --no-cache express@^4 cors@^2 better-sqlite3@^11 2>&1 | tail -3

ENV HOST=0.0.0.0
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

CMD ["sh", "-c", "echo '🐾 v24 - Iniciando Express + SQLite' && exec node server/index.js"]