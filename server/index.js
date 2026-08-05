// ============================================================
// API Server para ERP Animal
// ============================================================
// Stack: Node + Express + MariaDB (mysql2)
// Sirve la API REST + los archivos estáticos del frontend
// ============================================================

console.log('🐾 v14 - Cargando módulos...');

try {
    var express = require('express');
    var mysql = require('mysql2/promise');
    var path = require('path');
    var cors = require('cors');
    console.log('✅ Módulos cargados correctamente');
} catch (e) {
    console.error('❌ ERROR cargando módulos:', e.message);
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Configuración de BD
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'erp_animal',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 10000,
};

// ============================================================
// Conexión a BD
// ============================================================
let pool = null;

async function initDB() {
    try {
        console.log(`🔌 Conectando a MySQL ${DB_CONFIG.host}:${DB_CONFIG.port}...`);
        pool = mysql.createPool(DB_CONFIG);

        // Verificar conexión
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        console.log('✅ MySQL conectado correctamente');

        // Verificar si existe la tabla animals, si no, importar schema
        await ensureSchema();
    } catch (err) {
        console.error('❌ Error conectando a MySQL:', err.message);
        console.log('⚠️  La app funcionará en modo offline (localStorage)');
        pool = null;
    }
}

async function ensureSchema() {
    try {
        const [tables] = await pool.query("SHOW TABLES LIKE 'animals'");
        if (tables.length === 0) {
            console.log('📦 Tabla animals no existe, importando schema...');
            const fs = require('fs');
            const schema = fs.readFileSync(
                path.join(__dirname, 'schema.sql'),
                'utf8'
            );
            // Dividir por ; y ejecutar cada statement
            const statements = schema.split(';').filter(s => s.trim());
            for (const stmt of statements) {
                if (stmt.trim()) {
                    await pool.query(stmt);
                }
            }
            console.log('✅ Schema importado correctamente');
        } else {
            console.log('✅ Tabla animals ya existe');
        }
    } catch (err) {
        console.error('⚠️  Error importando schema:', err.message);
    }
}

// ============================================================
// Middleware
// ============================================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// ============================================================
// Helper: ejecutar query con fallback
// ============================================================
async function query(sql, params = []) {
    if (!pool) throw new Error('No DB connection');
    const [rows] = await pool.execute(sql, params);
    return rows;
}

// ============================================================
// API: Health check
// ============================================================
app.get('/api/health', async (req, res) => {
    try {
        const dbStatus = pool ? 'connected' : 'disconnected';
        let dbVersion = null;
        if (pool) {
            try {
                const [rows] = await pool.query('SELECT VERSION() as v');
                dbVersion = rows[0].v;
            } catch (e) {
                // ignore
            }
        }
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            db: dbStatus,
            db_version: dbVersion,
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ============================================================
// API: CRUD genérico para tablas
// ============================================================
const ALLOWED_TABLES = ['animals', 'feeding', 'health', 'reproduction', 'production', 'finances'];

app.get('/api/:table', async (req, res) => {
    const table = req.params.table;
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(400).json({ success: false, error: 'Tabla no permitida' });
    }

    try {
        if (!pool) {
            return res.json({ success: true, data: [], offline: true });
        }
        const rows = await query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 1000`);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error(`Error GET /api/${table}:`, err.message);
        res.json({ success: true, data: [], offline: true, error: err.message });
    }
});

app.post('/api/:table', async (req, res) => {
    const table = req.params.table;
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(400).json({ success: false, error: 'Tabla no permitida' });
    }

    try {
        if (!pool) {
            return res.json({ success: true, offline: true, id: Date.now() });
        }

        const data = req.body;
        const keys = Object.keys(data).filter(k => k !== 'id');
        const values = keys.map(k => data[k]);
        const placeholders = keys.map(() => '?').join(',');

        const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
        const result = await query(sql, values);
        res.json({ success: true, id: result.insertId, data: { ...data, id: result.insertId } });
    } catch (err) {
        console.error(`Error POST /api/${table}:`, err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/:table/:id', async (req, res) => {
    const table = req.params.table;
    const id = req.params.id;
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(400).json({ success: false, error: 'Tabla no permitida' });
    }

    try {
        if (!pool) {
            return res.json({ success: true, offline: true });
        }

        const data = req.body;
        const keys = Object.keys(data).filter(k => k !== 'id');
        const values = keys.map(k => data[k]);
        const setClause = keys.map(k => `${k} = ?`).join(',');

        const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
        await query(sql, [...values, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(`Error PUT /api/${table}/${id}:`, err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/:table/:id', async (req, res) => {
    const table = req.params.table;
    const id = req.params.id;
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(400).json({ success: false, error: 'Tabla no permitida' });
    }

    try {
        if (!pool) {
            return res.json({ success: true, offline: true });
        }
        await query(`DELETE FROM ${table} WHERE id = ?`, [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(`Error DELETE /api/${table}/${id}:`, err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// API: Legacy endpoint (compatibilidad con api.php antiguo)
// ============================================================
app.all('/api.php', async (req, res) => {
    const action = req.query.action || req.body?.action;
    const table = req.query.table || req.body?.table || 'animals';

    try {
        if (!ALLOWED_TABLES.includes(table)) {
            return res.json({ success: false, error: 'Tabla no permitida' });
        }

        if (!pool) {
            return res.json({ success: true, data: [], offline: true });
        }

        switch (action) {
            case 'fetch_all': {
                const rows = await query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 1000`);
                return res.json({ success: true, data: rows });
            }
            case 'create_record': {
                const data = req.body.data || req.body;
                const keys = Object.keys(data).filter(k => k !== 'id');
                const values = keys.map(k => data[k]);
                const placeholders = keys.map(() => '?').join(',');
                const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
                const result = await query(sql, values);
                return res.json({ success: true, id: result.insertId });
            }
            case 'update_record': {
                const data = req.body.data || req.body;
                const id = data.id || req.query.id;
                const keys = Object.keys(data).filter(k => k !== 'id');
                const values = keys.map(k => data[k]);
                const setClause = keys.map(k => `${k} = ?`).join(',');
                const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
                await query(sql, [...values, id]);
                return res.json({ success: true });
            }
            case 'delete_record': {
                const id = req.body.id || req.query.id;
                await query(`DELETE FROM ${table} WHERE id = ?`, [id]);
                return res.json({ success: true });
            }
            default:
                return res.json({ success: false, error: 'Acción no reconocida' });
        }
    } catch (err) {
        console.error(`Error /api.php:`, err.message);
        res.json({ success: false, error: err.message });
    }
});

// ============================================================
// Servir archivos estáticos del frontend
// ============================================================
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback: redirigir todas las rutas no-API al index.html
app.use((req, res, next) => {
    // Solo redirigir si NO es una ruta de API
    if (req.path.startsWith('/api') || req.path === '/api.php') {
        return res.status(404).json({ success: false, error: 'Endpoint no encontrado' });
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ============================================================
// Iniciar servidor
// ============================================================
async function start() {
    console.log('============================================');
    console.log('🐾 ERP Animal — Iniciando API Server v12');
    console.log('============================================');
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`🌐 Host: ${HOST}`);
    console.log(`🗄️  BD: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);

    // Importante: NO fallar si la BD no está lista, seguir funcionando offline
    try {
        await initDB();
    } catch (e) {
        console.error('⚠️  Error iniciando BD (continuando offline):', e.message);
    }

    app.listen(PORT, HOST, () => {
        console.log(`✅ Servidor escuchando en http://${HOST}:${PORT}`);
        console.log(`🔗 Health: http://${HOST}:${PORT}/api/health`);
        console.log(`🔗 API: http://${HOST}:${PORT}/api/animals`);
        console.log('============================================');
    });
}

start().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
