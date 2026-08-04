# ============================================================
# Dockerfile para Dokploy - ERP Animal v5
# ============================================================
# Stack: Node 20 (build) + nginx + PHP-FPM (runtime)
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

# Instalar PHP-FPM, extensiones, cliente MySQL y netcat
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
    bash \
    mysql-client \
    ncurses \
    mariadb-client \
    busybox-extras \
    netcat-openbsd \
    coreutils \
    util-linux

# Crear directorios necesarios
RUN mkdir -p /var/www/html /run/nginx /var/log/php83 /var/lib/nginx/tmp /var/lib/nginx/logs /docker-entrypoint-init.d

# Copiar el build del frontend
COPY --from=builder /app/dist/ /var/www/html/

# Copiar archivos PHP
COPY api.php /var/www/html/api.php
COPY schema.sql /var/www/html/schema.sql
COPY config.example.php /var/www/html/config.example.php

# Generar config.php inicial
RUN cp /var/www/html/config.example.php /var/www/html/config.php && \
    chmod 644 /var/www/html/config.php

# Configurar nginx
COPY docker-nginx.conf /etc/nginx/conf.d/default.conf

# Copiar entrypoint desde archivo externo
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && \
    ls -la /docker-entrypoint.sh && \
    head -3 /docker-entrypoint.sh && \
    sed -i 's/\r$//' /docker-entrypoint.sh && \
    echo "✅ Entrypoint listo (LF line endings)"

ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["/docker-entrypoint.sh"]