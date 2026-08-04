# ============================================================
# Dockerfile para Dokploy - ERP Animal v4
# ============================================================
# Stack: Node 20 (build) + nginx + PHP-FPM (runtime)
# Sirve frontend estático + ejecuta api.php para BD
# ============================================================

# ---------- Etapa 1: Build del frontend ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build && \
    echo "=== Build OK ===" && \
    ls -la /app/dist/

# ---------- Etapa 2: Imagen final con nginx + PHP-FPM ----------
FROM nginx:1.27-alpine AS production

# Instalar PHP-FPM y extensiones
RUN apk add --no-cache \
    php83 \
    php83-fpm \
    php83-pdo \
    php83-pdo_mysql \
    php83-mysqli \
    php83-mbstring \
    php83-opcache \
    php83-ctype \
    php83-fileinfo \
    curl \
    bash

# Crear directorios
RUN mkdir -p /var/www/html /run/nginx /var/log/php83 /var/lib/nginx/tmp /var/lib/nginx/logs

# Copiar el build del frontend
COPY --from=builder /app/dist/ /var/www/html/

# Copiar archivos PHP y schema
COPY api.php /var/www/html/api.php
COPY schema.sql /var/www/html/schema.sql
COPY config.example.php /var/www/html/config.example.php

# Generar config.php desde plantilla (será sobreescrito por entrypoint con env vars)
RUN cp /var/www/html/config.example.php /var/www/html/config.php && \
    chmod 644 /var/www/html/config.php

# Configurar nginx
COPY docker-nginx.conf /etc/nginx/conf.d/default.conf

# Script de inicio
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Permisos
RUN chown -R nginx:nginx /var/www/html && \
    chmod -R 755 /var/www/html && \
    chmod 644 /var/www/html/api.php && \
    chmod 644 /var/www/html/config.php && \
    chmod 644 /var/www/html/schema.sql

ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["/docker-entrypoint.sh"]