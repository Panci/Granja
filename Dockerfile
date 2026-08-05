# ============================================================
# Dockerfile para Dokploy - ERP Animal v13
# ============================================================
# IMPORTANTE: usa node:22-alpine para forzar invalidación completa del cache
# Stack: Node 22 + Express + MariaDB
# ============================================================

FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app

# Verificación visible al inicio
RUN echo "🐾 v13 - Construyendo imagen con Express" && \
    ls -la /tmp/

COPY --from=builder /app/package.json /app/package.json

# Forzar invalidación: instalar con --no-cache y packages específicos
RUN npm install --omit=dev --no-cache express@^4 mysql2@^3 cors@^2 2>&1 | tail -3

# Copiar servidor Express
COPY --from=builder /app/server/ /app/server/

# Copiar frontend
COPY --from=builder /app/dist/ /app/dist/

ENV HOST=0.0.0.0
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# CMD: ejecuta Express (NO usar serve)
CMD ["node", "server/index.js"]