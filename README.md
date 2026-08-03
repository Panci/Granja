# ERP Animal — Sistema de Gestión Veterinaria

Aplicación web progresiva (PWA-ready) para gestión de granjas, clínicas y refugios de animales. Controla inventario, salud, alimentación, reproducción, producción y finanzas en un solo lugar.

**Stack:** HTML + CSS + JavaScript vanilla + Vite + PHP/MySQL + LocalStorage.

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

## �� Despliegue en Hostinger (VPS)

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

**Opción A — SCP/SFTP:**

```bash
scp -r dist/* usuario@tu-vps-hostinger:/home/usuario/public_html/
```

**Opción B — rsync:**

```bash
rsync -avz --delete dist/ usuario@tu-vps-hostinger:/home/usuario/public_html/
```

**Opción C — Manual con FileZilla:** arrastra el contenido de `dist/` a `public_html/`.

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

## �� Licencia

MIT — Úsalo, modifícalo y mejóralo libremente.

---

## �� Soporte

Si encuentras un problema:

1. Revisa los logs de Apache: `tail -f /var/log/apache2/error.log`
2. Comprueba que PHP está activo: `php -v`
3. Comprueba que MySQL está activo: `systemctl status mysql`
4. Verifica permisos: `chmod 644 *.php *.html .htaccess`
5. Verifica la BD: `mysql -u erp_user -p erp_animal -e "SHOW TABLES;"`
