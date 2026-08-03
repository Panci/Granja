# ERP Animal — Sistema de Gestión Veterinaria

Aplicación web progresiva (PWA-ready) para gestión de granjas, clínicas y refugios de animales. Controla inventario, salud, alimentación, reproducción, producción y finanzas en un solo lugar.

**Stack:** HTML + CSS + JavaScript vanilla + Vite + PHP/MySQL + LocalStorage. **Docker-ready** para Dokploy.

---

## �� Características

- **Inventario** — Registro de animales con especie, raza, sexo, edad y estado
- **Salud** — Vacunas, desparasitaciones, tratamientos y alertas automatizadas
- **Alimentación** — Dietas por animal/grupo + tareas recurrentes
- **Reproducción** — Montas, gestaciones, registro de partos y crías
- **Producción** — Control de producción (huevos, leche, etc.)
- **Finanzas** — Gastos categorizados por especie o grupo
- **Offline-first** — Funciona con localStorage cuando no hay backend
- **Búsqueda + paginación** en todas las tablas
- **Sincronización con PHP/MySQL** en la nube

---

## 🐳 Despliegue en Dokploy (Recomendado)

Dokploy es un panel self-hosted similar a Vercel/Netlify pero para VPS. **Esta es la opción más fácil y robusta.**

### ⚠️ Importante: NO uses "Application" (Nixpacks), usa "Compose"

Cuando crees el servicio en Dokploy, **debes seleccionar "Compose"** (no "Application"). Si seleccionas "Application", Dokploy usará Nixpacks que NO soporta PHP.

### Requisitos

- VPS con Dokploy instalado (https://dokploy.com/)
- Repositorio Git (GitHub, GitLab, Gitea)

### Opción 1 — Todo en uno (docker-compose.yml)

La forma más simple: app + MariaDB juntos.

#### Paso 1 — Crear el servicio Compose

1. Entra a tu panel de Dokploy (ej. `https://dokploy.tu-dominio.com`)
2. Click en **Create Project** → nombre: `erp-animal`
3. Click en **Create Service** → **Compose** (NO Application)
4. **Source**: GitHub
5. **Repository**: `https://github.com/TU_USUARIO/Granja.git`
6. **Branch**: `main`
7. **Compose File**: `docker-compose.yml` (por defecto)

#### Paso 2 — Variables de entorno

En Dokploy → tu servicio → **Environment**, añade:

| Variable | Valor |
|---|---|
| `DB_NAME` | `erp_animal` |
| `DB_USER` | `erp_user` |
| `DB_PASS` | `TU_PASSWORD_SEGURA` |
| `MYSQL_ROOT_PASSWORD` | `OTRA_PASSWORD_SEGURA` |
| `TZ` | `Europe/Madrid` |

#### Paso 3 — Dominio y SSL

1. Ve a **Domains**
2. Añade: `erp.tu-dominio.com`
3. ✅ Marca **Generate SSL**
4. Configura DNS:
   ```
   erp.tu-dominio.com   →   A   →   IP_DE_TU_VPS
   ```

#### Paso 4 — Deploy

Click **Deploy**. Dokploy:
1. ✅ Clona el repo
2. ✅ Construye la imagen Docker
3. ✅ Levanta app + MariaDB
4. ✅ Importa schema.sql automáticamente
5. ✅ Configura SSL
6. ✅ App en `https://erp.tu-dominio.com/`

### Opción 2 — BD gestionada por Dokploy (recomendado para producción)

Esta opción usa la BD gestionada desde el panel de Dokploy, más robusta.

#### Paso 1 — Crear BD en Dokploy

1. Click **Create Service** → **Database** → **MariaDB**
2. Nombre: `erp-db`
3. Configura usuario y contraseña

#### Paso 2 — Crear servicio Compose (solo app)

1. **Create Service** → **Compose**
2. **Source**: GitHub, repo: `https://github.com/TU_USUARIO/Granja.git`
3. **Compose File**: `docker-compose.standalone.yml`

#### Paso 3 — Variables de entorno

Configura las variables con los datos de tu BD Dokploy:

| Variable | Valor |
|---|---|
| `DB_HOST` | (IP del servicio MariaDB) |
| `DB_PORT` | `3306` |
| `DB_NAME` | `erp_animal` |
| `DB_USER` | `erp_user` |
| `DB_PASS` | `TU_PASSWORD_SEGURA` |
| `TZ` | `Europe/Madrid` |

**Importante:** `DB_HOST` debe ser la IP interna del contenedor MariaDB. En Dokploy, puedes verla en la sección del servicio de BD.

#### Paso 4 — Importar esquema (primera vez)

Accede al terminal del contenedor MariaDB desde Dokploy y ejecuta:

```bash
mysql -u root -p
SOURCE /tmp/schema.sql;
EXIT;
```

(O copia el contenido de `schema.sql` al contenedor MariaDB y ejecútalo.)

#### Paso 5 — Dominio y Deploy

Igual que en Opción 1, paso 3 y 4.

### Actualizaciones futuras

```bash
git add .
git commit -m "feat: ..."
git push origin main
```

Dokploy redespliega automáticamente.

### Solución al error "No start command could be found"

Si ves este error, significa que Dokploy detectó un `package.json` y usó **Nixpacks en lugar de Docker**. Soluciones:

1. **Borra el servicio y créalo como "Compose"** (no Application)
2. **O cambia el tipo de build**: en la configuración del servicio, selecciona **Dockerfile** en lugar de Nixpacks

---

## 🛠️ Despliegue clásico en Hostinger (VPS sin Dokploy)

### Requisitos previos

- VPS Hostinger con **PHP 7.4+** y **MySQL/MariaDB**
- Acceso SSH o FTP al servidor
- Node.js 18+ local para construir el frontend

### 1️⃣ Crear la base de datos

Conecta por SSH al VPS y entra a MySQL:

```bash
mysql -u root -p
```

Crea la base de datos y ejecuta el esquema:

```sql
CREATE DATABASE erp_animal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE erp_animal;
SOURCE /ruta/a/schema.sql;
SHOW TABLES;
```

Deberías ver 10 tablas: `animals`, `vacunas`, `desparasitaciones`, `tratamientos`, `reproduccion`, `alimentacion`, `tareas`, `produccion`, `gastos`, `especies`.

Crea un usuario dedicado (recomendado):

```sql
CREATE USER 'erp_user'@'localhost' IDENTIFIED BY 'tu_password_segura';
GRANT ALL PRIVILEGES ON erp_animal.* TO 'erp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2️⃣ Construir el frontend (local)

En tu máquina local:

```bash
npm install
npm run build
```

Esto genera la carpeta `dist/` con:

- `index.html` (entrada)
- `assets/index.js`, `assets/index.css`, `assets/favicon.svg`
- `api.php` (backend)
- `schema.sql` (esquema de BD)
- `config.example.php` (plantilla de config)
- `.htaccess` (configuración Apache)

### 3️⃣ Subir al VPS

Tienes **3 opciones** según tu nivel de automatización:

#### ��️ Manual con SCP/SFTP (más simple)

```bash
scp -r dist/* usuario@tu-vps-hostinger:/home/usuario/public_html/
```

#### ��️ Manual con Git + script (recomendado)

Una vez clonado el repo en el VPS, futuras actualizaciones son tan simples como:

```bash
ssh usuario@tu-vps-hostinger
cd /home/usuario/public_html
./deploy.sh
```

Este script (`deploy.sh`) está incluido en el repo y automatiza:
- ✅ Backup del estado anterior (con rotación)
- ✅ Pull desde GitHub
- ✅ Build de producción
- ✅ Permisos correctos
- ✅ Verificación de BD

[Ver sección de configuración manual →](#configuración-del-script-deploysh)

#### �� Automático con GitHub Actions (más pro)

Cada `git push` a la rama `main` despliega automáticamente al VPS. Ver [despliegue automático →](#despliegue-automático-con-github

### 4️⃣ Configurar `config.php` en el VPS

En el servidor, copia el archivo de plantilla:

```bash
cd /home/usuario/public_html
cp config.example.php config.php
nano config.php
```

Edita con tus credenciales reales:

```php
$db_host = 'localhost';
$db_name = 'erp_animal';
$db_user = 'erp_user';
$db_pass = 'tu_password_segura';
```

**Más seguro** — usar variables de entorno. En el panel de Hostinger o por SSH:

```bash
# En /etc/apache2/sites-available/000-default.conf (o en .htaccess)
SetEnv ERP_DB_HOST "localhost"
SetEnv ERP_DB_NAME "erp_animal"
SetEnv ERP_DB_USER "erp_user"
SetEnv ERP_DB_PASS "tu_password_segura"
```

Protege el archivo:

```bash
chmod 640 config.php
```

### 5️⃣ Verificar el despliegue

Abre el navegador e ingresa a:

```
https://tu-dominio.com/
```

Deberías ver la app cargada. Para verificar el backend:

```
https://tu-dominio.com/api.php?action=fetch_all
```

Debe devolver un JSON con `{"success":true,"data":{...}}`.

Si ves errores 500, revisa los logs:

```bash
tail -f /var/log/apache2/error.log
```

### 6️⃣ Configurar SSL (HTTPS)

En el panel de Hostinger → **SSL** → **Activar Let's Encrypt** (gratis).

Una vez activado, el archivo `.htaccess` ya fuerza HTTPS automáticamente.

---

## �� Desarrollo local

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (http://localhost:5173)
npm run dev

# Build de producción (genera dist/)
npm run build

# Previsualizar build
npm run preview
```

### Sin backend PHP

La app funciona perfectamente **solo con localStorage** como fallback. Esto es ideal para:

- Pruebas locales sin servidor
- Modo offline
- Datos temporales

La sincronización con PHP/MySQL es opcional. Si la app no encuentra `api.php`, sigue funcionando al 100%.

---

## �� Estructura del proyecto

```
Granja/
├── index.html              # Entrada HTML
├── main.js                 # Bootstrap del frontend
├── package.json
├── vite.config.js          # Configuración de Vite
├── .htaccess               # Apache config (subir a public_html)
├── schema.sql              # Esquema MySQL
├── config.example.php      # Plantilla de config
├── api.php                 # Backend API REST
├── config.php              # Config con credenciales (NO subir)
├── css/
│   └── styles.css
├── js/
│   ├── app.js              # Aplicación principal
│   ├── store.js            # Capa de datos (localStorage + sync)
│   ├── utils/
│   │   ├── helpers.js      # Helpers UI (modal, toast, table, etc.)
│   │   └── charts.js       # Gráficos SVG sin dependencias
│   └── modules/
│       ├── inventario.js
│       ├── salud.js
│       ├── alimentacion.js
│       ├── reproduccion.js
│       ├── produccion.js
│       └── finanzas.js
└── assets/
    └── favicon.svg
```

---

## ��️ Seguridad

- **XSS protegido** — Todos los datos del usuario se escapan con `Helpers.escapeHtml()`
- **CSP básica** — Headers en `.htaccess`
- **HTTPS forzado** — Redirección 301 en `.htaccess`
- **Backlist de archivos** — `config.php`, `.env`, `schema.sql` no son accesibles desde el navegador
- **Whitelist de columnas** — `api.php` solo acepta columnas del esquema
- **PDO con prepared statements** — Sin SQL injection
- **Configuración fuera del repo** — `config.php` está en `.gitignore`

---

## �� Configuración del script `deploy.sh`

### 1. Primera vez en el VPS

```bash
ssh usuario@tu-vps-hostinger

# Instalar dependencias si no las tienes
sudo apt update
sudo apt install -y git nodejs npm mysql-client

# Clonar el repositorio
cd /home/usuario
git clone https://github.com/TU_USUARIO/Granja.git public_html
cd public_html

# Editar deploy.sh con tu configuración
nano deploy.sh
```

### 2. Variables a editar en `deploy.sh`

```bash
GIT_REPO="https://github.com/TU_USUARIO/Granja.git"   # Tu repo
GIT_BRANCH="main"                                       # Tu rama
APP_DIR="/home/usuario/public_html"                     # Ruta destino
```

### 3. Hacer ejecutable y probar

```bash
chmod +x deploy.sh
./deploy.sh
```

### 4. Futuros despliegues

```bash
ssh usuario@tu-vps-hostinger
cd /home/usuario/public_html
./deploy.sh
```

---

## �� Despliegue automático con GitHub Actions

Cada `git push` a `main` despliega automáticamente al VPS. Solo necesitas configurar los **Secrets** en GitHub.

### Paso 1 — Generar clave SSH para deploy

**En tu máquina local:**

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy
```

Esto genera:
- `~/.ssh/github_deploy` (privada — para GitHub)
- `~/.ssh/github_deploy.pub` (pública — para el VPS)

### Paso 2 — Añadir la clave pública al VPS

```bash
# Copia la clave pública al VPS
ssh-copy-id -i ~/.ssh/github_deploy.pub usuario@tu-vps-hostinger

# O manualmente:
cat ~/.ssh/github_deploy.pub | ssh usuario@tu-vps-hostinger \
  "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

### Paso 3 — Añadir Secrets en GitHub

Ve a tu repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Nombre | Valor |
|--------|-------|
| `VPS_HOST` | `tu-vps-hostinger.com` (IP o dominio) |
| `VPS_USER` | `usuario` (SSH user) |
| `VPS_PORT` | `22` (opcional, default 22) |
| `VPS_SSH_KEY` | Contenido de `~/.ssh/github_deploy` (la clave **privada** completa) |
| `VPS_DOMAIN` | `tu-dominio.com` (sin https://) |
| `APP_DIR` | `/home/usuario/public_html` |

Para obtener el contenido de la clave privada:

```bash
cat ~/.ssh/github_deploy
```

Copia **todo** el output (incluyendo `-----BEGIN...` y `-----END...`).

### Paso 4 — Subir el workflow

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: deploy automático al VPS"
git push origin main
```

### Paso 5 — Verificar

1. Ve a tu repo → pestaña **Actions**
2. Verás el workflow "Deploy to Hostinger VPS" corriendo
3. Cuando termine (1-2 minutos), visita `https://tu-dominio.com/`

### Actualizaciones futuras

```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
```

¡Eso es todo! El deploy ocurre automáticamente.

---

## �� Solución de problemas

### El deploy falla por "Permission denied"

```bash
# En el VPS
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### API devuelve error 500

```bash
# Revisa logs de Apache
sudo tail -f /var/log/apache2/error.log

# Verifica que PHP funciona
php -v

# Verifica conexión a BD
mysql -u erp_user -p erp_animal -e "SHOW TABLES;"
```

### Frontend carga pero no sincroniza con BD

```bash
# Verifica que api.php responde JSON
curl https://tu-dominio.com/api.php?action=fetch_all

# Si devuelve HTML, ves el error PHP (puede ser de .htaccess)
# Asegúrate de que mod_rewrite y mod_headers están activos
sudo a2enmod rewrite headers
sudo systemctl restart apache2
```

---

## �� Licencia

MIT — Úsalo, modifícalo y mejóralo libremente.

---

## ⚡ Quick Reference

### Desarrollo local
```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # genera dist/
npm run preview      # preview del build
```

### Deploy manual (VPS)
```bash
ssh usuario@tu-vps-hostinger
cd /home/usuario/public_html
./deploy.sh
```

### Deploy automático (GitHub Actions)
```bash
git push origin main    # �� Se despliega solo
```

### Backup de la BD
```bash
mysqldump -u erp_user -p erp_animal > backup_$(date +%Y%m%d).sql
```

### Restaurar BD
```bash
mysql -u erp_user -p erp_animal < backup_20260803.sql
```

---

## �� Soporte

Si encuentras un problema:

1. Revisa los logs de Apache: `tail -f /var/log/apache2/error.log`
2. Comprueba que PHP está activo: `php -v`
3. Comprueba que MySQL está activo: `systemctl status mysql`
4. Verifica permisos: `chmod 644 *.php *.html .htaccess`
5. Verifica la BD: `mysql -u erp_user -p erp_animal -e "SHOW TABLES;"`
