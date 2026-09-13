# ERP Animal

Aplicación Node.js para gestionar animales, salud, alimentación, reproducción, producción y gastos. Express sirve el frontend y SQLite persiste los datos.

## Antes de desplegar

1. Exporta los datos de la aplicación anterior.
2. Haz una copia del volumen SQLite de producción.
3. Configura `ADMIN_PASSWORD` y `SESSION_SECRET` en Dokploy; nunca los subas al repositorio.
4. Inicia sesión e importa el backup para guardarlo en la nueva API.

Esta versión reemplaza el despliegue PHP/MariaDB por Express + SQLite.

## Desarrollo

```bash
cp .env.example .env
# Sustituye los secretos de ejemplo
npm ci
npm run build
npm start
```

En PowerShell: `Copy-Item .env.example .env`.

Se requiere Node.js 22 o superior. `npm run dev` sirve solo Vite; para probar autenticación y SQLite usa `npm start` después del build.

## Variables

| Variable | Uso |
| --- | --- |
| `ADMIN_PASSWORD` | Contraseña de acceso; mínimo 12 caracteres. |
| `SESSION_SECRET` | Secreto aleatorio de al menos 32 caracteres para firmar sesiones. |
| `DB_PATH` | Ruta de SQLite; por defecto `./data/erp_animal.db`. |
| `NODE_ENV=production` | Activa cookies `Secure`; exige HTTPS en producción. |

Genera el secreto con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## API y calidad

La API requiere una sesión `HttpOnly` firmada; solo `GET /api/health` es público. Las colecciones son `animals`, `vacunas`, `desparasitaciones`, `tratamientos`, `dietas`, `tareas`, `reproduccion`, `produccion`, `gastos` y `especies`.

```bash
npm test
npm run build
```

La integración con GitHub ejecuta ambas comprobaciones en cada push y pull request. El despliegue soportado es `docker-compose.yml` con el volumen `granja-data`.
