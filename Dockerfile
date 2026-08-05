# ============================================================
# Dockerfile SIMPLE FINAL
# ============================================================
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080
# v17: comando simple sin spa fallback
CMD ["npx", "serve", "-s", "/app/dist", "-l", "tcp://0.0.0.0:8080", "--no-clipboard"]   