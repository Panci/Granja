#!/usr/bin/env bash
# ============================================================
# deploy.sh — Script de despliegue para Hostinger VPS
# ============================================================
# Ejecuta este script en tu VPS para hacer pull desde GitHub
# y desplegar la última versión automáticamente.
#
# Uso:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Personalización:
#   Edita las variables de la sección "CONFIGURACIÓN" abajo.
# ============================================================

set -e  # Salir si hay errores

# ---------- CONFIGURACIÓN ----------
GIT_REPO="https://github.com/TU_USUARIO/Granja.git"   # <-- Cambia esto
GIT_BRANCH="main"
APP_DIR="/home/usuario/public_html"                   # <-- Cambia si usas otro path
APP_NAME="Granja"
BACKUP_DIR="/home/usuario/backups"
KEEP_BACKUPS=5
# -----------------------------------

echo "�� Iniciando despliegue de $APP_NAME..."
echo "�� Repo: $GIT_REPO"
echo "�� Destino: $APP_DIR"
echo "---"

# 1. Verificar dependencias
echo "1️⃣ Verificando dependencias..."
if ! command -v git &> /dev/null; then
    echo "❌ git no está instalado. Ejecuta: sudo apt install git"
    exit 1
fi
if ! command -v node &> /dev/null; then
    echo "⚠️  node no está instalado. Continuando sin reinstalar dependencias..."
fi
echo "✅ git disponible: $(git --version)"
echo ""

# 2. Crear backup del estado actual
echo "2️⃣ Creando backup..."
if [ -d "$APP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/${APP_NAME,,}_backup_${TIMESTAMP}.tar.gz"
    tar -czf "$BACKUP_FILE" -C "$(dirname "$APP_DIR")" "$(basename "$APP_DIR")" 2>/dev/null || true
    echo "✅ Backup creado: $BACKUP_FILE"

    # Limpiar backups antiguos (mantener solo los últimos N)
    if [ -d "$BACKUP_DIR" ]; then
        cd "$BACKUP_DIR" && ls -t ${APP_NAME,,}_backup_*.tar.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm
        echo "✅ Backups antiguos limpiados (manteniendo últimos $KEEP_BACKUPS)"
    fi
else
    echo "⚠️  Directorio $APP_DIR no existe, saltando backup"
fi
echo ""

# 3. Clonar o actualizar el repositorio
echo "3️⃣ Clonando/actualizando repositorio..."
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    echo "�� Actualizando rama $GIT_BRANCH..."
    git fetch origin
    git reset --hard "origin/$GIT_BRANCH"
    echo "✅ Código actualizado"
else
    echo "�� Clonando por primera vez..."
    mkdir -p "$(dirname "$APP_DIR")"
    git clone -b "$GIT_BRANCH" "$GIT_REPO" "$APP_DIR"
    cd "$APP_DIR"
    echo "✅ Repositorio clonado"
fi
echo ""

# 4. Instalar dependencias y construir
echo "4️⃣ Construyendo frontend..."
if command -v npm &> /dev/null; then
    npm install --production=false
    npm run build
    echo "✅ Build completado"
else
    echo "⚠️  npm no disponible — saltando build. Instala Node.js 18+ y vuelve a ejecutar."
    exit 1
fi
echo ""

# 5. Preservar config.php (no se sobrescribe con el repo)
echo "5️⃣ Verificando config.php..."
if [ ! -f "$APP_DIR/config.php" ]; then
    if [ -f "$APP_DIR/config.example.php" ]; then
        cp "$APP_DIR/config.example.php" "$APP_DIR/config.php"
        chmod 640 "$APP_DIR/config.php"
        echo "⚠️  config.php creado desde plantilla. EDITA LAS CREDENCIALES."
    else
        echo "❌ No se encontró config.example.php"
        exit 1
    fi
else
    echo "✅ config.php existente preservado"
fi
echo ""

# 6. Ajustar permisos
echo "6️⃣ Configurando permisos..."
chmod -R 755 "$APP_DIR"
chmod 644 "$APP_DIR"/.htaccess
chmod 644 "$APP_DIR"/index.html
chmod 644 "$APP_DIR"/config.php
chmod 644 "$APP_DIR"/api.php
chmod 644 "$APP_DIR"/schema.sql
find "$APP_DIR" -type f -name "*.php" -exec chmod 644 {} \;
find "$APP_DIR" -type f -name "*.js" -exec chmod 644 {} \;
find "$APP_DIR" -type f -name "*.css" -exec chmod 644 {} \;
echo "✅ Permisos aplicados"
echo ""

# 7. Aplicar esquema de BD si está vacío
echo "7️⃣ Verificando base de datos..."
if [ -f "$APP_DIR/schema.sql" ]; then
    # Lee credenciales desde config.php
    DB_HOST=$(grep -oP "(?<=DB_HOST'\\)\\| => ')[^']*" "$APP_DIR/config.php" 2>/dev/null | head -1 || echo "localhost")
    DB_NAME=$(grep "DB_NAME" "$APP_DIR/config.php" | grep -oP "'[^']*'" | tail -1 | tr -d "'")
    DB_USER=$(grep "DB_USER" "$APP_DIR/config.php" | grep -oP "'[^']*'" | tail -1 | tr -d "'")
    DB_PASS=$(grep "DB_PASS" "$APP_DIR/config.php" | grep -oP "'[^']*'" | tail -1 | tr -d "'")

    if [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
        read -s -p "�� Password de BD para $DB_USER: " DB_PASS_INPUT
        echo ""
        if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS_INPUT" "$DB_NAME" -e "SHOW TABLES LIKE 'animals';" 2>/dev/null | grep -q "animals"; then
            echo "✅ Tabla 'animals' existe en $DB_NAME"
        else
            echo "↻ Importando schema.sql a $DB_NAME..."
            mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS_INPUT" "$DB_NAME" < "$APP_DIR/schema.sql"
            echo "✅ Esquema importado"
        fi
    else
        echo "⚠️  No se pudieron leer credenciales de config.php. Saltando verificación de BD."
    fi
else
    echo "⚠️  schema.sql no encontrado"
fi
echo ""

# 8. Limpiar caché de OPcache (si está habilitado)
echo "8️⃣ Limpiando caché PHP..."
if [ -d "/var/www/.opcache" ]; then
    find /var/www/.opcache -type f -delete 2>/dev/null || true
fi
echo "✅ Caché limpiado"
echo ""

echo "�� ¡Despliegue completado!"
echo ""
echo "�� Resumen:"
echo "  • Repo: $GIT_REPO"
echo "  • Rama: $GIT_BRANCH"
echo "  • Destino: $APP_DIR"
echo "  • Backend: $APP_DIR/dist/api.php"
echo "  • Config: $APP_DIR/config.php"
echo ""
echo "�� Verifica que todo funcione:"
echo "  • https://tu-dominio.com/"
echo "  • https://tu-dominio.com/api.php?action=fetch_all"
