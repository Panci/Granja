# ============================================================
# Dockerfile para Dokploy - ERP Animal v11
# ============================================================
# Stack: Node 20 + Express + MariaDB
# ============================================================

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

COPY --from=builder /app/package.json /app/package.json

# Instalar SOLO dependencias de producción (forzar invalidación de cache)
RUN npm install --omit=dev --no-cache express mysql2 cors 2>&1 | tail -3

# Copiar servidor
COPY --from=builder /app/server/ /app/server/

# Copiar frontend
COPY --from=builder /app/dist/ /app/dist/

ENV HOST=0.0.0.0
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Healthcheck usando el endpoint /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# CMD en formato JSON (mejor compatibilidad con señales)
# Verificar primero que el archivo existe y luego ejecutar
CMD ["sh", "-c", "ls -la /app/server/ && echo 'Iniciando...' && exec node server/index.js"]