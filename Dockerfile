# ============================================================
# Dockerfile para Dokploy - ERP Animal v7 (simple)
# ============================================================
# Stack: Node 20 (build) + Node 20 + serve (runtime)
# Solo frontend estático. Sincronización con BD via frontend.
# ============================================================

# ---------- Etapa 1: Build del frontend ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- Etapa 2: Imagen final con serve ----------
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/dist/ /app/dist/
COPY --from=builder /app/package.json /app/package.json

RUN npm install --omit=dev serve

ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "echo 'Iniciando serve...' && exec npx serve -s /app/dist -l tcp://0.0.0.0:3000 --no-clipboard --no-port-switching"]