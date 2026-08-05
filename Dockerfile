# ============================================================
# Dockerfile v20 - Express + MariaDB + Frontend
# ============================================================
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app

COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/server/ /app/server/
COPY --from=builder /app/dist/ /app/dist/

# Instalar dependencias de producción (Express + MariaDB)
RUN npm install --omit=dev --no-cache express@^4 mysql2@^3 cors@^2 2>&1 | tail -3

ENV HOST=0.0.0.0
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

CMD ["sh", "-c", "echo '🐾 v20 - Iniciando Express + MariaDB' && exec node server/index.js"]