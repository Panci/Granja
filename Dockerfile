# ============================================================
# Dockerfile para Dokploy - ERP Animal
# ============================================================

# ---------- Etapa 1: Build del frontend ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- Etapa 2: Imagen final ----------
FROM node:20-alpine AS production

WORKDIR /app

# Copiar solo lo necesario
COPY --from=builder /app/dist/ /app/dist/
COPY --from=builder /app/package.json /app/package.json

# Instalar serve como dependencia local
RUN npm install --omit=dev serve && \
    echo "✅ Archivos en dist:" && ls -la /app/dist/

ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

# CMD simple sin healthcheck (wget puede no estar disponible)
CMD ["sh", "-c", "node node_modules/serve/build/main.js -s /app/dist -l tcp://0.0.0.0:8080"]