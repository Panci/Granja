# ============================================================
# Dockerfile simple para Dokploy
# ============================================================
# Sirve el frontend estático con `vite preview` directamente.
# Esto evita problemas con nginx + permisos + configuración.
#
# Dokploy/Traefik espera que el contenedor escuche en el puerto 3000
# (configurado con la variable de entorno PORT).
# ============================================================

# ---------- Etapa 1: Build del frontend con Node ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --no-audit --no-fund

# Copiar el código fuente
COPY . .

# Build de producción
RUN npm run build

# ---------- Etapa 2: Imagen final ligera con Node + serve ----------
FROM node:20-alpine AS production

WORKDIR /app

# Instalar 'serve' globalmente para servir archivos estáticos
RUN npm install -g serve

# Copiar solo el build del frontend (más ligero)
COPY --from=builder /app/dist/ /app/dist/

# Verificar que existe el index.html
RUN ls -la /app/dist/

# Variables de entorno
ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

# Servir el frontend estático en el puerto 8080 (evita conflicto con Dokploy 3000)
CMD ["sh", "-c", "serve -s /app/dist -l tcp://0.0.0.0:8080"]