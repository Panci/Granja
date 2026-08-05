# ============================================================
# Dockerfile ULTRA SIMPLE v18 - FINAL
# ============================================================
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080
# v18 - usando http-server en lugar de serve para evitar problemas
RUN npm install -g http-server
CMD ["http-server", "/app/dist", "-p", "8080", "-a", "0.0.0.0", "--cors", "-c-1", "-s"]