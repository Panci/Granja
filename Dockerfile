# ============================================================
# Dockerfile para Dokploy (compatible con Nixpacks)
# ============================================================
# Usa nginx para servir el frontend estático + PHP-FPM para api.php
# Esto funciona con Dokploy en modo "Application" (Nixpacks)
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

# ---------- Etapa 2: Imagen final con nginx + PHP-FPM ----------
FROM nginx:1.27-alpine

# Instalar PHP-FPM y extensiones necesarias
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
    curl

# Crear directorios necesarios
RUN mkdir -p /var/www/html /run/nginx /var/log/php83 /var/lib/nginx/tmp

# Configurar nginx
COPY docker-nginx.conf /etc/nginx/conf.d/default.conf

# Copiar el build del frontend
COPY --from=builder /app/dist/ /var/www/html/

# Asegurar permisos
RUN chown -R nginx:nginx /var/www/html && \
    chmod -R 755 /var/www/html

# Script de inicio
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]