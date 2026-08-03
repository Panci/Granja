#!/usr/bin/env bash
# ============================================================
# docker-entrypoint.sh — Script de entrada para Dokploy
# ============================================================
# Este script se ejecuta cada vez que el contenedor arranca.
# Se encarga de:
#   1. Esperar a que MySQL esté disponible
#   2. Crear config.php si no existe, desde variables de entorno
#   3. Importar schema.sql si la BD está vacía
#   4. Ajustar permisos
# ============================================================

set -e

echo "============================================"
echo "🐾 ERP Animal — Iniciando..."
echo "============================================"

# ---------- 1. Configurar Apache ----------
# Asegurar que DocumentRoot es /var/www/html
if [ -f /etc/apache2/sites-available/000-default.conf ]; then
    sed -i 's|/var/www/html|/var/www/html|g' /etc/apache2/sites-available/000-default.conf
fi

# ---------- 2. Generar config.php desde variables de entorno ----------
echo "⚙️  Configurando PHP..."

if [ -f /var/www/html/config.example.php ]; then
    # Si no existe config.php, créalo desde la plantilla
    if [ ! -f /var/www/html/config.php ]; then
        echo "📝 Creando config.php desde plantilla..."
        cp /var/www/html/config.example.php /var/www/html/config.php
    fi

    # Sobrescribir credenciales con variables de entorno (si están definidas)
    # Variables reconocidas:
    #   DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT

    if [ -n "$DB_HOST" ]; then
        sed -i "s|\$db_host = getenv([^)]*) ?: '[^']*'|\$db_host = getenv('DB_HOST') ?: '$DB_HOST'|" /var/www/html/config.php
        # Reemplazo directo si la sintaxis exacta no coincide
        sed -i "s|'localhost';|$DB_HOST';|" /var/www/html/config.php || true
    fi

    if [ -n "$DB_NAME" ]; then
        sed -i "s|\$db_name = getenv([^)]*) ?: '[^']*'|\$db_name = getenv('DB_NAME') ?: '$DB_NAME'|" /var/www/html/config.php
    fi

    if [ -n "$DB_USER" ]; then
        sed -i "s|\$db_user = getenv([^)]*) ?: '[^']*'|\$db_user = getenv('DB_USER') ?: '$DB_USER'|" /var/www/html/config.php
    fi

    if [ -n "$DB_PASS" ]; then
        sed -i "s|\$db_user = getenv([^)]*) ?: ''|\$db_user = getenv('DB_USER') ?: '$DB_USER'|" /var/www/html/config.php
        sed -i "s|\$db_pass = getenv([^)]*) ?: ''|\$db_pass = getenv('DB_PASS') ?: '$DB_PASS'|" /var/www/html/config.php
    fi

    if [ -n "$DB_PORT" ]; then
        sed -i "s|host=\$db_host;|host=\$db_host;port=$DB_PORT;|" /var/www/html/config.php
    fi

    chmod 644 /var/www/html/config.php
    chown www-data:www-data /var/www/html/config.php
    echo "✅ config.php configurado"
else
    echo "⚠️  config.example.php no encontrado, saltando configuración"
fi

# ---------- 3. Esperar a que MySQL esté disponible ----------
echo "⏳ Esperando a MySQL..."
MAX_TRIES=15
TRIES=0
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS:-}

# Sólo intentar conectar si MySQL no es localhost (es decir, es un servicio aparte)
if [ "$DB_HOST" != "localhost" ] && [ "$DB_HOST" != "127.0.0.1" ]; then
    until mysqladmin ping -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" --connect-timeout=3 2>/dev/null; do
        TRIES=$((TRIES + 1))
        if [ $TRIES -ge $MAX_TRIES ]; then
            echo "⚠️  No se pudo conectar a MySQL después de $MAX_TRIES intentos"
            echo "⚠️  Continuando de todas formas — la app seguirá funcionando con localStorage"
            break
        fi
        echo "  Intento $TRIES/$MAX_TRIES..."
        sleep 2
    done

    if [ $TRIES -lt $MAX_TRIES ]; then
        echo "✅ MySQL disponible en $DB_HOST"

        # Importar schema si la tabla 'animals' no existe
        DB_NAME=${DB_NAME:-erp_animal}
        echo "📦 Verificando esquema en $DB_NAME..."
        if ! mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES LIKE 'animals';" 2>/dev/null | grep -q "animals"; then
            if [ -f /var/www/html/schema.sql ]; then
                echo "↻ Importando schema.sql..."
                mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < /var/www/html/schema.sql
                echo "✅ Esquema importado"
            else
                echo "⚠️  schema.sql no encontrado"
            fi
        else
            echo "✅ Tabla 'animals' ya existe"
        fi
    fi
else
    echo "ℹ️  DB_HOST=localhost, asumiendo MySQL local (no se importará schema automáticamente)"
fi

# ---------- 4. Permisos finales ----------
echo "🔐 Ajustando permisos..."
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html

echo "============================================"
echo "🎉 ERP Animal listo!"
echo "============================================"

# ---------- 5. Ejecutar el comando recibido ----------
exec "$@"