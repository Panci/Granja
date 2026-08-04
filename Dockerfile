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
    netcat-openbsd

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

# Crear entrypoint inline en /docker-entrypoint.sh
# Esto evita problemas con line endings de CRLF en Windows
RUN printf '%s\n' \
    '#!/bin/sh' \
    'set -e' \
    'echo "============================================"' \
    'echo "🐾 ERP Animal — Iniciando (nginx + PHP-FPM)"' \
    'echo "============================================"' \
    '' \
    '# DEBUG: Mostrar env vars de BD' \
    'echo "🔍 Variables de entorno de BD:"' \
    'echo "  DB_HOST=${DB_HOST:-(vacío)}"' \
    'echo "  DB_NAME=${DB_NAME:-(vacío)}"' \
    'echo "  DB_USER=${DB_USER:-(vacío)}"' \
    'echo "  DB_PORT=${DB_PORT:-3306}"' \
    'if [ -z "$DB_PASS" ]; then echo "  DB_PASS=(vacío)"; else echo "  DB_PASS=(presente, longitud: ${#DB_PASS})"; fi' \
    '' \
    '# DEBUG: Mostrar config.php generado' \
    'echo "🔍 config.php generado:"' \
    'grep -E "db_host|db_name|db_user" /var/www/html/config.php 2>/dev/null || echo "  (no se pudo leer)"' \
    '' \
    '# Configurar PHP' \
    'if [ -f /var/www/html/config.example.php ]; then' \
    '    if [ ! -f /var/www/html/config.php ]; then' \
    '        cp /var/www/html/config.example.php /var/www/html/config.php' \
    '    fi' \
    '    if [ -n "$DB_HOST" ]; then sed -i "s|\x27localhost\x27;|\x27$DB_HOST\x27;|" /var/www/html/config.php || true; fi' \
    '    if [ -n "$DB_NAME" ]; then sed -i "s|\x27u123456_erp_animal\x27;|\x27$DB_NAME\x27;|" /var/www/html/config.php || true; fi' \
    '    if [ -n "$DB_USER" ]; then sed -i "s|\x27u123456_admin\x27;|\x27$DB_USER\x27;|" /var/www/html/config.php || true; fi' \
    '    if [ -n "$DB_PASS" ]; then sed -i "s|\x27tu_password_segura\x27;|\x27$DB_PASS\x27;|" /var/www/html/config.php || true; fi' \
    '    chmod 644 /var/www/html/config.php' \
    '    echo "✅ config.php configurado"' \
    'fi' \
    '' \
    '# Esperar a MySQL' \
    'if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "localhost" ] && [ "$DB_HOST" != "127.0.0.1" ]; then' \
    '    echo "⏳ Esperando a MySQL en $DB_HOST:3306..."' \
    '    echo "🔍 Probando resolución DNS de $DB_HOST..."' \
    '    php -r "echo gethostbyname(\x27$DB_HOST\x27) . PHP_EOL;" 2>&1 || echo "  (gethostbyname falló)"' \
    '    echo "🔍 Probando fsockopen..."' \
    '    php -r "\$fp = @fsockopen(\x27$DB_HOST\x27, 3306, \$errno, \$errstr, 3); if (!\$fp) { echo \x27Error: \x27 . \$errno . \x27 - \x27 . \$errstr . PHP_EOL; } else { echo \x27Conectado!\x27 . PHP_EOL; fclose(\$fp); }"' \
    '    MYSQL_OK=0' \
    '    for i in 1 2 3 4 5 6 7 8 9 10; do' \
    '        if php -r "exit(@fsockopen(getenv(\x27DB_HOST\x27),3306,\$e,\$er,3) ? 1 : 0);" 2>/dev/null; then' \
    '            echo "✅ MySQL disponible (intento $i)"' \
    '            MYSQL_OK=1' \
    '            break' \
    '        fi' \
    '        sleep 2' \
    '    done' \
    '    if [ "$MYSQL_OK" = "1" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASS" ]; then' \
    '        DB_NAME_FINAL=${DB_NAME:-erp_animal}' \
    '        echo "📋 Verificando si la tabla animals existe..."' \
    '        TABLE_EXISTS=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" -N -e "SHOW TABLES LIKE \x27animals\x27;" "$DB_NAME_FINAL" 2>/dev/null)' \
    '        if [ -n "$TABLE_EXISTS" ]; then' \
    '            echo "✅ Tabla animals ya existe"' \
    '        elif [ -f /var/www/html/schema.sql ]; then' \
    '            echo "📦 Importando schema.sql en $DB_NAME_FINAL..."' \
    '            mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME_FINAL" < /var/www/html/schema.sql' \
    '            IMPORT_RESULT=$?' \
    '            if [ "$IMPORT_RESULT" -eq 0 ]; then' \
    '                echo "✅ Schema importado correctamente"' \
    '            else' \
    '                echo "⚠️  Fallo al importar schema (código $IMPORT_RESULT) - continuando..."' \
    '            fi' \
    '        else' \
    '            echo "⚠️  schema.sql no encontrado"' \
    '        fi' \
    '    else' \
    '        echo "⚠️  MySQL no disponible o credenciales faltantes - continuando..."' \
    '    fi' \
    'fi' \
    '' \
    '# Iniciar PHP-FPM' \
    'mkdir -p /run' \
    'php-fpm83 -D 2>/dev/null || true' \
    'sleep 2' \
    'if pgrep -f php-fpm > /dev/null; then echo "✅ PHP-FPM corriendo"; else echo "⚠️  PHP-FPM no detectado"; fi' \
    '' \
    '# Permisos' \
    'chown -R nginx:nginx /var/www/html 2>/dev/null || true' \
    'chmod -R 755 /var/www/html 2>/dev/null || true' \
    '' \
    'echo "🎉 ERP Animal listo!"' \
    'echo "============================================"' \
    '' \
    '# Iniciar nginx en primer plano' \
    'exec nginx -g "daemon off;"' \
    > /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh && \
    ls -la /docker-entrypoint.sh && \
    head -3 /docker-entrypoint.sh

ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

# Verificar que el entrypoint existe antes de CMD
RUN test -x /docker-entrypoint.sh || (echo "❌ ERROR: entrypoint no ejecutable" && exit 1)

CMD ["/docker-entrypoint.sh"]