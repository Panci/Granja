# ============================================================
# Dockerfile para Dokploy - ERP Animal v16 STANDALONE
# ============================================================
# Solo frontend estático. Sin BD por ahora.
# Funciona 100% offline con localStorage.
# ============================================================

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- Imagen final: solo servir archivos estáticos ----------
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=builder /app/dist/ /app/dist/
RUN npm install --omit=dev --no-cache serve 2>&1 | tail -2

ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["sh", "-c", "echo '🐾 ERP Animal v16 - Servidor de archivos estáticos' && exec npx serve -s /app/dist -l tcp://0.0.0.0:8080 --no-clipboard --no-port-switching"]