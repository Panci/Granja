#!/usr/bin/sh
# ============================================================
# docker-entrypoint.sh — nginx + PHP-FPM
# ============================================================

set -e

echo "============================================"
echo "🐾 ERP Animal — Iniciando (nginx + PHP-FPM)"
echo "============================================"

# ---------- 1. Configurar PHP ----------
echo "⚙️  Configurando PHP-FPM..."

# Asegurar que los directorios existen
mkdir -p /var/log/php83 /run/nginx /var/lib/nginx/logs /var/lib/nginx/tmp

# Generar config.php desde plantilla con env vars
if [ -f /var/www/html/config.example.php ]; then
    if [ ! -f /var/www/html/config.php ]; then
        cp /var/www/html/config.example.php /var/www/html/config.php
    fi

    # Sobrescribir credenciales con env vars (si están definidas)
    if [ -n "$DB_HOST" ]; then
        sed -i "s|'localhost';|'$DB_HOST';|" /var/www/html/config.php || true
    fi
    if [ -n "$DB_NAME" ]; then
        sed -i "s|'u123456_erp_animal';|'$DB_NAME';|" /var/www/html/config.php || true
    fi
    if [ -n "$DB_USER" ]; then
        sed -i "s|'u123456_admin';|'$DB_USER';|" /var/www/html/config.php || true
    fi
    if [ -n "$DB_PASS" ]; then
        sed -i "s|'tu_password_segura';|'$DB_PASS';|" /var/www/html/config.php || true
    fi

    chmod 644 /var/www/html/config.php
    chown nginx:nginx /var/www/html/config.php 2>/dev/null || true
    echo "✅ config.php configurado"
fi

# ---------- 2. Esperar a MySQL (no bloqueante) ----------
if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "localhost" ] && [ "$DB_HOST" != "127.0.0.1" ]; then
    echo "⏳ Esperando a MySQL en $DB_HOST..."
    for i in $(seq 1 15); do
        if nc -z -w3 "$DB_HOST" 3306 2>/dev/null; then
            echo "✅ MySQL disponible"
            break
        fi
        sleep 2
    done

    # Intentar importar schema si no existe
    DB_NAME_FINAL=${DB_NAME:-erp_animal}
    if [ -n "$DB_USER" ] && [ -n "$DB_PASS" ]; then
        if ! mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME_FINAL" \
             -e "SHOW TABLES LIKE 'animals';" 2>/dev/null | grep -q "animals"; then
            echo "📦 Importando schema.sql..."
            mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME_FINAL" < /var/www/html/schema.sql && \
                echo "✅ Schema importado" || echo "⚠️  No se pudo importar schema (continuando...)"
        else
            echo "✅ Tabla 'animals' ya existe"
        fi
    fi
fi

# ---------- 3. Iniciar PHP-FPM ----------
echo "🚀 Iniciando PHP-FPM..."
mkdir -p /run
php-fpm83 -D 2>/dev/null || php-fpm83 --daemonize 2>/dev/null || true
sleep 2

# Verificar PHP-FPM
if pgrep -f php-fpm > /dev/null; then
    echo "✅ PHP-FPM corriendo"
else
    echo "⚠️  PHP-FPM no detectado, intentando otra forma..."
    php-fpm83 &
fi

# ---------- 4. Permisos finales ----------
chown -R nginx:nginx /var/www/html 2>/dev/null || true
chmod -R 755 /var/www/html 2>/dev/null || true

echo "============================================"
echo "🎉 ERP Animal listo!"
echo "============================================"

# ---------- 5. Iniciar nginx en primer plano ----------
exec nginx -g "daemon off;"