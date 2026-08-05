# ERP Animal — Sistema de Gestión Veterinaria

Aplicación web responsive para gestión de granjas, clínicas y refugios de animales. Controla inventario, salud, alimentación, reproducción, producción y finanzas en un solo lugar.

**Stack:** HTML + CSS + JavaScript vanilla + Vite + Express.js + SQLite + LocalStorage. **Docker-ready** para Dokploy.

---

## 🐾 Características

- **Inventario** — Registro de animales con especie, raza, sexo, edad y estado
- **Salud** — Vacunas, desparasitaciones, tratamientos y alertas automatizadas
- **Alimentación** — Dietas por animal/grupo + tareas recurrentes
- **Reproducción** — Montas, gestaciones, registro de partos y crías
- **Producción** — Control de producción (huevos, leche, etc.)
- **Finanzas** — Gastos categorizados por especie o grupo
- **Responsive** — Sidebar en PC, barra inferior en móvil
- **Offline-first** — Funciona con localStorage cuando no hay backend
- **Búsqueda + paginación** en todas las tablas
- **Sincronización con SQLite** persistente en VPS
- **Deploy automático** desde GitHub vía Dokploy

---

## 🚀 Stack Técnico

| Capa | Tecnología |
|---|---|
| Frontend | HTML + CSS + JavaScript vanilla |
| Build | Vite 6 |
| Backend | Express.js (Node.js 22) |
| Base de datos | SQLite (better-sqlite3) |
| Contenedor | Docker + Docker Compose |
| Deploy | Dokploy + Traefik (SSL automático) |
| Persistencia | Volume Docker `granja-data` |

---

## 📁 Estructura

```
Granja/
├── index.html              # HTML principal
├── main.js                 # Entry point JS
├── css/styles.css          # Estilos (incluye responsive móvil)
├── js/
│   ├── app.js              # Shell de la app (sidebar + bottom nav)
│   ├── store.js            # Estado global + sync con backend
│   ├── modules/            # Módulos por sección
│   │   ├── inventario.js
│   │   ├── salud.js
│   │   ├── alimentacion.js
│   │   ├── reproduccion.js
│   │   ├── produccion.js
│   │   └── finanzas.js
│   └── utils/
│       ├── helpers.js
│       └── charts.js
├── server/
│   └── index.js            # Backend Express + SQLite
├── Dockerfile              # Build multi-stage
├── docker-compose.yml      # Deploy con Traefik + healthcheck
└── README.md
```

---

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Dev server (Vite con HMR)
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview
```

---

## 🐳 Deploy con Dokploy

### 1. Crear servicio

1. En Dokploy, **Create Service → Compose**
2. Nombre: `granjafinal` (o el que prefieras)
3. **Provider**: Git (SSH)
4. **Repository URL**: `git@github.com:Panci/Granja.git`
5. **Branch**: `main`
6. **SSH Key**: `granja-completo` (creada y añadida a GitHub Deploy Keys)
7. **Compose Path**: `./docker-compose.yml`

### 2. Configurar Build Type

En la pestaña **General** del servicio:
- Scroll abajo hasta **"Build Type"**
- Selecciona **"DockerFile"** (no Nixpacks)

### 3. Configurar dominio

1. Pestaña **"Domains"** → **Add Domain**
2. Configurar:
   ```
   Service Name:    app
   Host:            granjafps-c04e16-186-240-144-11.sslip.io
   Path:            /
   Internal Path:   /
   Container Port:  8080
   HTTPS:           OFF
   ```
3. Click **"Create"**

### 4. Verificar

Logs esperados tras el deploy:
```
🐾 ERP Animal — Backend con SQLite
📡 Puerto: 8080
💾 BD: /app/data/erp_animal.db
✅ SQLite inicializado correctamente
   Tablas: animals, feeding, health, reproduction, production, finances
```

URL: `http://granjafps-c04e16-186-240-144-11.sslip.io/`

---

## 🗄️ Base de Datos SQLite

La BD vive en `/app/data/erp_animal.db` dentro del contenedor.

**Persistencia:** Volumen Docker `granjafinal-zupmbr_granja-data` (creado automáticamente por Compose).

**Esquema:**
- `animals` — Animales registrados
- `feeding` — Registro de alimentación
- `health` — Vacunas y tratamientos
- `reproduction` — Montas y partos
- `production` — Producción (huevos, leche)
- `finances` — Gastos e ingresos

**API Endpoints:**
```
GET    /api/health               → Estado del servidor
GET    /api/:table               → Listar todos
POST   /api/:table               → Crear/actualizar
DELETE /api/:table/:id           → Eliminar
GET    /api.php?action=fetch_all → Obtener todo
POST   /api.php?action=create    → Crear
POST   /api.php?action=update    → Actualizar
POST   /api.php?action=delete    → Eliminar
```

---

## 📱 Diseño Responsive

La app se adapta automáticamente:

### PC (> 768px)
- **Sidebar fija** a la izquierda con todas las secciones
- Contenido principal ocupa el resto

### Móvil (≤ 768px)
- **Barra inferior fija** con 5 botones principales:
  - 📊 Inicio
  - 🐾 Animales
  - 🏥 Salud
  - 🥣 Alimentos
  - 🥚 Producción
- **Botón "⋯ Más"** abre menú popup con:
  - 🐣 Reproducción
  - 💰 Finanzas
  - 💾 Exportar Datos
  - 📂 Importar Datos
- Sidebar oculto (accesible solo por toggle si está)

**Tamaños de la barra inferior (móvil):**
- Altura: 92px (incluye safe-area-inset-bottom para iPhone notch)
- Iconos: 30px
- Texto: 13px (bold)

---

## 🔑 Variables de Entorno

El servidor Express acepta:
```
HOST       (default: 0.0.0.0)
PORT       (default: 8080)
DB_PATH    (default: /app/data/erp_animal.db)
```

---

## 📝 Notas Técnicas

### Healthcheck

El docker-compose incluye un healthcheck usando Node.js (no wget, no está en alpine):
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "fetch('http://localhost:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
```

**Importante:** Dokploy solo enruta el tráfico al contenedor cuando está `healthy`. Sin healthcheck válido → 404 permanente.

### Cache-busting

Express envía headers `no-cache` en todos los assets:
```js
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

### HTTPS en móvil

⚠️ Los navegadores móviles **fuerzan HTTPS** automáticamente. Para usar `*.sslip.io`:
- Escribir manualmente `http://` (no dejar que auto-redirija)

Para HTTPS automático en producción: configurar Let's Encrypt en Dokploy o usar Cloudflare Tunnel.

---

## 🐛 Troubleshooting

### "502 Bad Gateway" tras deploy
1. Verificar que el contenedor está `healthy` en pestaña **Containers**
2. Si está `unhealthy`: revisar logs, probablemente error en DB_PATH o puerto

### "404 Not Found" en la URL
1. Verificar que el **dominio está creado** con `Container Port: 8080`
2. Verificar que el contenedor está `healthy`
3. Hacer **Redeploy** después de cualquier cambio

### El frontend carga versión vieja
1. Headers `no-cache` están configurados
2. En móvil: usar **navegación privada** o **borrar caché**
3. En PC: **Ctrl+F5**

### MariaDB / MySQL no funciona
El VPS puede no tener acceso a Docker Hub. **Solución:** usar SQLite (incluido), no necesita descargar imágenes.

---

## 📜 Changelog

### v21 (actual)
- ✅ Backend Express + SQLite (sin MariaDB)
- ✅ Deploy con Compose + Traefik + healthcheck
- ✅ **Barra inferior móvil** (responsive design)
- ✅ Menú "Más" con Reproducción/Finanzas/Exportar/Importar
- ✅ Sidebar oculta en móvil
- ✅ Headers anti-caché
- ✅ Persistencia en volumen Docker

### v18-v20
- ❌ MariaDB (no accesible al Docker Hub del VPS)
- ❌ Docker Compose sin healthcheck (contenedor unhealthy)
- ❌ Traefik no encontraba rutas (sin labels correctos)

### v1-v17
- LocalStorage only (modo offline)
- Sin backend persistente
- Sin responsive móvil

---

## 🤝 Contribuir

```bash
# Fork + clone
git clone git@github.com:TU-USUARIO/Granja.git
cd Granja

# Crear rama
git checkout -b feature/nueva-funcionalidad

# Commit (mensajes claros)
git commit -m "feat: añadir módulo de facturación"

# Push + PR
git push origin feature/nueva-funcionalidad
```

---

## 📄 Licencia

MIT