// ============================================================
// ERP Animal — Backend con SQLite
// ============================================================
// BD persistente en archivo del VPS (volume Docker).
// Acceso desde cualquier dispositivo.
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Configuración SQLite
const DB_PATH = process.env.DB_PATH || '/app/data/erp_animal.db';

let db = null;

// ============================================================
// Funciones de BD
// ============================================================
function initDB() {
    try {
        // Crear directorio si no existe
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');

        // Crear tablas si no existen
        const tables = [
            `CREATE TABLE IF NOT EXISTS animals (
                id TEXT PRIMARY KEY,
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS feeding (
                id TEXT PRIMARY KEY,
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS health (
                id TEXT PRIMARY KEY,
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS reproduction (
                id TEXT PRIMARY KEY,
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS production (
                id TEXT PRIMARY KEY,
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS finances (
                id TEXT PRIMARY KEY,
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
        ];

        for (const sql of tables) {
            db.exec(sql);
        }

        console.log('✅ SQLite inicializado correctamente');
        console.log(`   DB_PATH: ${DB_PATH}`);

        // Listar tablas existentes
        const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        console.log(`   Tablas: ${existingTables.map(t => t.name).join(', ')}`);
    } catch (err) {
        console.error('❌ Error inicializando SQLite:', err.message);
        db = null;
    }
}

// ============================================================
// Middleware
// ============================================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Log de requests
app.use((req, res, next) => {
    if (!req.path.startsWith('/assets')) {
        console.log(`📥 ${req.method} ${req.path}`);
    }
    next();
});

// ============================================================
// API: Health check
// ============================================================
app.get('/api/health', (req, res) => {
    const dbStatus = db ? 'connected' : 'disconnected';
    res.json({
        status: 'ok',
        db: dbStatus,
        timestamp: new Date().toISOString(),
    });
});

// ============================================================
// API: CRUD genérico
// ============================================================
const ALLOWED_TABLES = ['animals', 'feeding', 'health', 'reproduction', 'production', 'finances'];

// GET /api/:table - Listar todos
app.get('/api/:table', (req, res) => {
    const table = req.params.table;
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(400).json({ success: false, error: 'Tabla no permitida' });
    }
    try {
        if (!db) {
            return res.json({ success: true, data: [] });
        }
        const rows = db.prepare(`SELECT id, data FROM ${table} ORDER BY updated_at DESC`).all();
        const items = rows.map(row => {
            try {
                return JSON.parse(row.data);
            } catch {
                return { id: row.id };
            }
        });
        res.json({ success: true, data: items });
    } catch (err) {
        console.error(`Error GET /api/${table}:`, err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/:table - Crear o actualizar
app.post('/api/:table', (req, res) => {
    const table = req.params.table;
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(400).json({ success: false, error: 'Tabla no permitida' });
    }
    try {
        if (!db) {
            return res.json({ success: true, offline: true });
        }
        const data = req.body;
        if (!data || !data.id) {
            return res.status(400).json({ success: false, error: 'Falta id' });
        }
        const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`);
        stmt.run(data.id, JSON.stringify(data));
        res.json({ success: true, id: data.id });
    } catch (err) {
        console.error(`Error POST /api/${table}:`, err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/:table/:id
app.delete('/api/:table/:id', (req, res) => {
    const table = req.params.table;
    const id = req.params.id;
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(400).json({ success: false, error: 'Tabla no permitida' });
    }
    try {
        if (!db) {
            return res.json({ success: true, offline: true });
        }
        db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
        res.json({ success: true });
    } catch (err) {
        console.error(`Error DELETE /api/${table}/${id}:`, err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// API: fetch_all - Compatibilidad con api.php antiguo
// ============================================================
app.all('/api.php', (req, res) => {
    const action = req.query.action || req.body?.action;
    const collection = req.query.collection || req.body?.collection;

    if (!db) {
        return res.json({ success: true, data: [], offline: true });
    }

    try {
        switch (action) {
            case 'create': {
                const data = req.body.data || req.body;
                const table = collection;
                if (!ALLOWED_TABLES.includes(table)) {
                    return res.json({ success: false, error: 'Tabla no permitida' });
                }
                if (!data.id) {
                    return res.json({ success: false, error: 'Falta id' });
                }
                db.prepare(`INSERT OR REPLACE INTO ${table} (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`).run(data.id, JSON.stringify(data));
                return res.json({ success: true });
            }
            case 'update': {
                const data = req.body.data || req.body;
                const table = collection;
                if (!ALLOWED_TABLES.includes(table)) {
                    return res.json({ success: false, error: 'Tabla no permitida' });
                }
                db.prepare(`INSERT OR REPLACE INTO ${table} (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`).run(data.id, JSON.stringify(data));
                return res.json({ success: true });
            }
            case 'delete': {
                const table = collection;
                const id = req.query.id || req.body.id;
                if (!ALLOWED_TABLES.includes(table)) {
                    return res.json({ success: false, error: 'Tabla no permitida' });
                }
                db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
                return res.json({ success: true });
            }
            case 'fetch_all': {
                const allData = {};
                for (const t of ALLOWED_TABLES) {
                    try {
                        const rows = db.prepare(`SELECT id, data FROM ${t}`).all();
                        allData[t] = rows.map(row => {
                            try {
                                return JSON.parse(row.data);
                            } catch {
                                return { id: row.id };
                            }
                        });
                    } catch {
                        allData[t] = [];
                    }
                }
                return res.json({ success: true, data: allData });
            }
            case 'create_record': {
                const data = req.body.data || req.body;
                const table = collection;
                if (!ALLOWED_TABLES.includes(table)) {
                    return res.json({ success: false, error: 'Tabla no permitida' });
                }
                if (!data.id) {
                    return res.json({ success: false, error: 'Falta id' });
                }
                db.prepare(`INSERT OR REPLACE INTO ${table} (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`).run(data.id, JSON.stringify(data));
                return res.json({ success: true });
            }
            case 'update_record': {
                const data = req.body.data || req.body;
                const table = collection;
                if (!ALLOWED_TABLES.includes(table)) {
                    return res.json({ success: false, error: 'Tabla no permitida' });
                }
                db.prepare(`INSERT OR REPLACE INTO ${table} (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`).run(data.id, JSON.stringify(data));
                return res.json({ success: true });
            }
            case 'delete_record': {
                const table = collection;
                const id = req.query.id || req.body.id;
                if (!ALLOWED_TABLES.includes(table)) {
                    return res.json({ success: false, error: 'Tabla no permitida' });
                }
                db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
                return res.json({ success: true });
            }
            default:
                return res.json({ success: false, error: 'Acción no reconocida' });
        }
    } catch (err) {
        console.error(`Error /api.php ${action}:`, err.message);
        res.json({ success: false, error: err.message });
    }
});

// ============================================================
// Servir el frontend estático
// ============================================================
app.use(express.static(path.join(__dirname, '..', 'dist')));

// SPA fallback
app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/api.php') {
        return res.status(404).json({ success: false, error: 'Endpoint no encontrado' });
    }
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// ============================================================
// Iniciar servidor
// ============================================================
initDB();

app.listen(PORT, HOST, () => {
    console.log('============================================');
    console.log('🐾 ERP Animal — Backend con SQLite');
    console.log('============================================');
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`🌐 Host: ${HOST}`);
    console.log(`💾 BD: ${DB_PATH}`);
    console.log(`🔗 Health: http://${HOST}:${PORT}/api/health`);
    console.log('============================================');
});