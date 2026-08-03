# ============================================================
# Dockerfile para ERP Animal
# Multi-stage build para imagen final ligera (PHP + Apache)
# ============================================================

# ---------- Etapa 1: Build del frontend con Node ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json primero para aprovechar caché de Docker
COPY package*.json ./

# Instalar dependencias
RUN npm ci --no-audit --no-fund

# Copiar el resto del código fuente
COPY . .

# Build de producción
RUN npm run build

# ---------- Etapa 2: Imagen final con PHP + Apache ----------
FROM php:8.2-apache

# Metadata
LABEL maintainer="ERP Animal <contact@example.com>"
LABEL description="Sistema de Gestión Veterinaria"

# Argumentos para la versión de MySQL cliente (opcional)
ARG MYSQL_CLIENT_VERSION=mysql-client

# Instalar extensiones PHP necesarias + cliente MySQL + utilidades
RUN apt-get update && apt-get install -y --no-install-recommends \
    ${MYSQL_CLIENT_VERSION} \
    libzip-dev \
    zip \
    unzip \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Instalar extensiones PHP (PDO MySQL, ZIP, OPCache)
RUN docker-php-ext-install pdo pdo_mysql zip opcache

# Configurar OPCache para producción
RUN { \
    echo 'opcache.memory_consumption=128'; \
    echo 'opcache.interned_strings_buffer=16'; \
    echo 'opcache.max_accelerated_files=10000'; \
    echo 'opcache.revalidate_freq=2'; \
    echo 'opcache.fast_shutdown=1'; \
    echo 'opcache.enable_cli=1'; \
    echo 'opcache.validate_timestamps=0'; \
    echo 'opcache.save_comments=1'; \
    echo 'opcache.enable_file_override=1'; \
    } > /usr/local/etc/php/conf.d/opcache-recommended.ini

# Habilitar mod_rewrite de Apache (para .htaccess)
RUN a2enmod rewrite headers expires deflate

# Establecer directorio de trabajo en la raíz del sitio web
WORKDIR /var/www/html

# Copiar el build de producción desde la etapa anterior
COPY --from=builder /app/dist/ /var/www/html/

# Copiar scripts de utilidad (entrypoint, schema SQL si necesita importarse)
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Crear archivo config.php desde plantilla si no existe
RUN if [ ! -f /var/www/html/config.php ]; then \
    cp /var/www/html/config.example.php /var/www/html/config.php; \
    fi

# Permisos correctos
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod 644 /var/www/html/.htaccess \
    && chmod 644 /var/www/html/config.php \
    && chmod 644 /var/www/html/api.php \
    && chmod 644 /var/www/html/index.html \
    && chmod 644 /var/www/html/schema.sql

# Healthcheck: verifica que la app responde
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Variables de entorno por defecto (pueden ser sobreescritas en Dokploy)
ENV APACHE_DOCUMENT_ROOT=/var/www/html \
    APACHE_LOG_DIR=/var/log/apache2 \
    PHP_DISPLAY_ERRORS=Off \
    PHP_ERROR_REPORTING=E_ALL

# Puerto expuesto
EXPOSE 80

# Entry point que ejecuta Apache en primer plano
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["apache2-foreground"]