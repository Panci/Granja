# ============================================================
# Dockerfile para Dokploy - ERP Animal v9 (Express + MariaDB)
# ============================================================
# Stack: Node 20 (build) + Node 20 + Express + mysql2 (runtime)
# Sirve frontend estático + API REST para sincronización con BD
# ============================================================

ARG CACHEBUST=1

# ---------- Etapa 1: Build del frontend ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar TODAS las dependencias (dev + prod) para hacer el build
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- Etapa 2: Imagen final con Express ----------
FROM node:20-alpine AS production

WORKDIR /app

# Copiar package.json
COPY --from=builder /app/package.json /app/package.json

# Instalar SOLO dependencias de producción (express, mysql2, cors)
# También instalamos serve como fallback
# IMPORTANTE: --no-cache fuerza invalidar el cache de Docker
RUN npm install --omit=dev --no-cache express mysql2 cors serve 2>&1 | tail -5

# Copiar el código del servidor
COPY --from=builder /app/server/ /app/server/

# Copiar el build del frontend
COPY --from=builder /app/dist/ /app/dist/

# Eliminar archivos PHP antiguos (Express maneja la API)
RUN rm -f /app/dist/api.php /app/dist/config.php /app/dist/config.example.php /app/dist/schema.sql /app/dist/README.md && \
    echo "✅ Archivos PHP eliminados del dist" && \
    ls -la /app/dist/

# Verificar instalación
RUN ls -la /app/node_modules/express/package.json && \
    ls -la /app/node_modules/mysql2/package.json && \
    ls -la /app/server/ && \
    ls -la /app/dist/ | head -5 && \
    echo "✅ Todo listo"

ENV HOST=0.0.0.0
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

CMD ["sh", "-c", "echo '🐾 Iniciando ERP Animal API Server v10...' && exec node server/index.js 2>&1"]</new_str>