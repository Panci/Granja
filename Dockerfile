# ============================================================
# Dockerfile v19 - multi-stage con nombre production
# ============================================================
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist/ /app/dist/
COPY --from=builder /app/package.json /app/package.json
RUN npm install -g http-server
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080
CMD ["http-server", "/app/dist", "-p", "8080", "-a", "0.0.0.0", "--cors", "-c-1", "-s"]