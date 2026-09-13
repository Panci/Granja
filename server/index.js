// ERP Animal — API Express + SQLite
// Los datos se sirven solo al mismo origen y requieren una sesión autenticada.

'use strict';

const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'erp_animal.db');
const COOKIE_NAME = 'erp_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_RECORD_BYTES = 256 * 1024;
const ID_PATTERN = /^[A-Z]{3}-[0-9]{3,}$/;
const COLLECTIONS = [
  'animals', 'vacunas', 'desparasitaciones', 'tratamientos', 'dietas',
  'tareas', 'reproduccion', 'produccion', 'gastos', 'especies',
];

let db = null;
const loginAttempts = new Map();

function requireSecret(name, minimumLength) {
  const value = process.env[name];
  if (!value || value.length < minimumLength) {
    throw new Error(`${name} debe estar definido y tener al menos ${minimumLength} caracteres.`);
  }
  return value;
}

function getSecrets() {
  return {
    password: requireSecret('ADMIN_PASSWORD', 12),
    sessionSecret: requireSecret('SESSION_SECRET', 32),
  };
}

function initDB() {
  if (db) return db;
  const dir = path.dirname(DB_PATH);
  fs.mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  for (const collection of COLLECTIONS) {
    db.exec(`CREATE TABLE IF NOT EXISTS ${collection} (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
  }
  return db;
}

function closeDB() {
  if (db) {
    db.close();
    db = null;
  }
}

function assertCollection(collection) {
  if (!COLLECTIONS.includes(collection)) {
    const error = new Error('Colección no permitida');
    error.status = 404;
    throw error;
  }
}

function parseStoredRecord(row) {
  try {
    return JSON.parse(row.data);
  } catch {
    return { id: row.id };
  }
}

function getRecord(collection, id) {
  return db.prepare(`SELECT id, data FROM ${collection} WHERE id = ?`).get(id);
}

function validateAndPrepareRecord(record, existingRow) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    const error = new Error('El registro debe ser un objeto JSON');
    error.status = 400;
    throw error;
  }
  if (typeof record.id !== 'string' || !ID_PATTERN.test(record.id)) {
    const error = new Error('ID de registro inválido');
    error.status = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const existing = existingRow ? parseStoredRecord(existingRow) : null;
  const normalized = {
    ...(existing || {}),
    ...record,
    id: record.id,
    _createdAt: existing?._createdAt || record._createdAt || now,
    _updatedAt: now,
  };
  const serialized = JSON.stringify(normalized);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_RECORD_BYTES) {
    const error = new Error('El registro supera el tamaño máximo permitido');
    error.status = 413;
    throw error;
  }
  return { normalized, serialized, now };
}

function upsertRecord(collection, record) {
  const existing = getRecord(collection, record.id);
  const { normalized, serialized, now } = validateAndPrepareRecord(record, existing);
  db.prepare(`INSERT INTO ${collection} (id, data, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`)
    .run(normalized.id, serialized, normalized._createdAt, now);
  return normalized;
}

function signSession(expiresAt, secret) {
  return crypto.createHmac('sha256', secret).update(`erp-session:${expiresAt}`).digest('base64url');
}

function createSessionToken(secret) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return `${expiresAt}.${signSession(expiresAt, secret)}`;
}

function isValidSession(token, secret) {
  if (typeof token !== 'string') return false;
  const [expiresAtText, signature] = token.split('.');
  const expiresAt = Number(expiresAtText);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || !signature) return false;
  const expected = signSession(expiresAt, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function validPassword(password, expected) {
  const received = Buffer.from(String(password || ''));
  const expectedBuffer = Buffer.from(expected);
  return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  };
}

function clientIp(req) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function loginAllowed(ip) {
  const now = Date.now();
  const current = loginAttempts.get(ip);
  if (!current || current.resetAt <= now) return true;
  return current.count < 5;
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const current = loginAttempts.get(ip);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
  } else {
    current.count += 1;
  }
}

function requireAuth(req, res, next) {
  try {
    const { sessionSecret } = getSecrets();
    if (!isValidSession(req.cookies[COOKIE_NAME], sessionSecret)) {
      return res.status(401).json({ success: false, error: 'Autenticación requerida' });
    }
    next();
  } catch (error) {
    next(error);
  }
}

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "'unsafe-inline'"],
      // La interfaz heredada conserva manejadores onclick. Los datos dinámicos
      // se serializan/escapan antes de llegar a esos manejadores.
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", 'data:'],
      "connect-src": ["'self'"],
      // La aplicación puede publicarse temporalmente por HTTP en el puerto
      // del VPS; al usar un dominio con HTTPS, el proxy se encarga de TLS.
      "upgrade-insecure-requests": null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: db ? 'ok' : 'degraded', database: Boolean(db) });
});

app.post('/api/auth/login', (req, res, next) => {
  try {
    const ip = clientIp(req);
    if (!loginAllowed(ip)) {
      return res.status(429).json({ success: false, error: 'Demasiados intentos. Inténtalo más tarde.' });
    }
    const { password, sessionSecret } = getSecrets();
    if (!validPassword(req.body?.password, password)) {
      recordFailedLogin(ip);
      return res.status(401).json({ success: false, error: 'Contraseña incorrecta' });
    }
    loginAttempts.delete(ip);
    res.cookie(COOKIE_NAME, createSessionToken(sessionSecret), cookieOptions());
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/session', (req, res, next) => {
  try {
    const { sessionSecret } = getSecrets();
    res.json({ success: true, authenticated: isValidSession(req.cookies[COOKIE_NAME], sessionSecret) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });
  res.json({ success: true });
});

app.use('/api', requireAuth);

app.get('/api/sync', (req, res) => {
  const data = {};
  for (const collection of COLLECTIONS) {
    const rows = db.prepare(`SELECT id, data FROM ${collection} ORDER BY updated_at DESC`).all();
    data[collection] = rows.map(parseStoredRecord);
  }
  res.json({ success: true, data });
});

app.post('/api/import', (req, res, next) => {
  try {
    const imported = req.body;
    if (!imported || typeof imported !== 'object' || Array.isArray(imported)) {
      return res.status(400).json({ success: false, error: 'Backup inválido' });
    }
    db.exec('BEGIN IMMEDIATE');
    try {
      let saved = 0;
      for (const collection of COLLECTIONS) {
        const records = imported[collection];
        if (!Array.isArray(records)) continue;
        for (const record of records) {
          upsertRecord(collection, record);
          saved += 1;
        }
      }
      db.exec('COMMIT');
      res.json({ success: true, saved });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

app.get('/api/:collection', (req, res, next) => {
  try {
    const { collection } = req.params;
    assertCollection(collection);
    const rows = db.prepare(`SELECT id, data FROM ${collection} ORDER BY updated_at DESC`).all();
    res.json({ success: true, data: rows.map(parseStoredRecord) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/:collection', (req, res, next) => {
  try {
    const { collection } = req.params;
    assertCollection(collection);
    res.status(201).json({ success: true, data: upsertRecord(collection, req.body) });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/:collection/:id', (req, res, next) => {
  try {
    const { collection, id } = req.params;
    assertCollection(collection);
    if (!ID_PATTERN.test(id)) return res.status(400).json({ success: false, error: 'ID de registro inválido' });
    db.prepare(`DELETE FROM ${collection} WHERE id = ?`).run(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(path.join(__dirname, '..', 'dist'), {
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-store'),
}));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ success: false, error: 'Endpoint no encontrado' });
  const index = path.join(__dirname, '..', 'dist', 'index.html');
  if (!fs.existsSync(index)) return next(new Error('No existe el build del frontend. Ejecuta npm run build.'));
  res.sendFile(index);
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ success: false, error: status >= 500 ? 'Error interno del servidor' : error.message });
});

function startServer() {
  getSecrets();
  initDB();
  return app.listen(PORT, HOST, () => {
    console.log(`ERP Animal escuchando en http://${HOST}:${PORT}`);
    console.log(`Base de datos: ${DB_PATH}`);
  });
}

if (require.main === module) startServer();

module.exports = { app, startServer, initDB, closeDB, COLLECTIONS };
