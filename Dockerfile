# ============================================================
# Dockerfile para Dokploy - ERP Animal
# ============================================================
# Sirve el frontend estático con 'serve' en el puerto 8080
# (Puerto 3000 está reservado por Dokploy para su panel)
# ============================================================

# ---------- Etapa 1: Build del frontend ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json primero (mejor caché de Docker)
COPY package*.json ./

# Instalar dependencias
RUN npm install --no-audit --no-fund

# Copiar el código fuente
COPY . .

# Build de producción
RUN npm run build

# ---------- Etapa 2: Imagen final ligera ----------
FROM node:20-alpine AS production

WORKDIR /app

# Copiar archivos del frontend (sin node_modules)
COPY --from=builder /app/dist/ /app/dist/
COPY --from=builder /app/package.json /app/package.json

# Instalar solo 'serve' como dep de producción
RUN npm install --omit=dev serve 2>/dev/null || npm install -g serve

# Verificar archivos críticos
RUN ls -la /app/dist/ && echo "✅ Build OK"

# Variables de entorno
ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Script de inicio con verificación
CMD ["sh", "-c", "echo '🚀 Iniciando servidor en puerto 8080...' && npx serve -s /app/dist -l tcp://0.0.0.0:8080 --no-clipboard"]