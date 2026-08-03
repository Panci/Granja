#!/usr/bin/env sh
# ============================================================
# docker-entrypoint.sh — Para nginx + PHP-FPM (Alpine)
# ============================================================

set -e

echo "============================================"
echo "🐾 ERP Animal — Iniciando (nginx + PHP-FPM)"
echo "============================================"

# ---------- 1. Configurar PHP-FPM ----------
echo "⚙️  Configurando PHP..."

if [ -f /var/www/html/config.example.php ]; then
    if [ ! -f /var/www/html/config.php ]; then
        echo "📝 Creando config.php desde plantilla..."
        cp /var/www/html/config.example.php /var/www/html/config.php
    fi

    # Sobrescribir credenciales con env vars
    [ -n "$DB_HOST" ] && sed -i "s|'localhost';|'$DB_HOST';|" /var/www/html/config.php || true
    [ -n "$DB_NAME" ] && sed -i "s|'u123456_erp_animal';|'$DB_NAME';|" /var/www/html/config.php || true
    [ -n "$DB_USER" ] && sed -i "s|'u123456_admin';|'$DB_USER';|" /var/www/html/config.php || true
    [ -n "$DB_PASS" ] && sed -i "s|'tu_password_segura';|'$DB_PASS';|" /var/www/html/config.php || true

    chmod 644 /var/www/html/config.php
    echo "✅ config.php configurado"
fi

# ---------- 2. Esperar MySQL (no bloqueante) ----------
if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "localhost" ] && [ "$DB_HOST" != "127.0.0.1" ]; then
    echo "⏳ Esperando a MySQL en $DB_HOST..."
    for i in $(seq 1 10); do
        if nc -z -w3 "$DB_HOST" 3306 2>/dev/null; then
            echo "✅ MySQL disponible"
            break
        fi
        sleep 2
    done
fi

# ---------- 3. Iniciar PHP-FPM en background ----------
echo "🚀 Iniciando PHP-FPM..."
mkdir -p /var/log/php83 /run
php-fpm83 --daemonize 2>/dev/null || php-fpm83 -D 2>/dev/null || true

# Verificar que arrancó
sleep 2
if ! pgrep -f php-fpm > /dev/null; then
    echo "⚠️  PHP-FPM no arrancó, intentando otra forma..."
    php-fpm83 -D &
fi

# ---------- 4. Permisos finales ----------
chown -R nginx:nginx /var/www/html 2>/dev/null || true
chmod -R 755 /var/www/html

echo "============================================"
echo "🎉 ERP Animal listo!"
echo "============================================"

# ---------- 5. Ejecutar el comando recibido (CMD) ----------
exec "$@"