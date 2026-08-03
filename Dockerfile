# ============================================================
# Dockerfile para Dokploy - ERP Animal v3
# ============================================================

# ---------- Etapa 1: Build del frontend ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build && \
    echo "=== Build OK ===" && \
    ls -la /app/dist/ && \
    cat /app/dist/index.html | head -5

# ---------- Etapa 2: Imagen final con servidor HTTP nativo ----------
FROM node:20-alpine AS production

WORKDIR /app

# Copiar solo lo necesario
COPY --from=builder /app/dist/ /app/dist/
COPY --from=builder /app/package.json /app/package.json

# Instalar serve
RUN npm install --omit=dev serve && \
    echo "=== Verificación ===" && \
    ls -la /app/dist/ && \
    ls -la /app/node_modules/serve/build/ 2>/dev/null | head -10

ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

# CMD con verificación de archivos antes de iniciar
CMD ["sh", "-c", "echo '=== Iniciando servidor ===' && ls -la /app/dist/index.html && echo '=== Puerto: 8080 ===' && exec npx serve -s /app/dist -l tcp://0.0.0.0:8080 --no-clipboard --no-port-switching"]