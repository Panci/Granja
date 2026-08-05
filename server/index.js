// ============================================================
// ERP Animal — Backend ULTRA SIMPLE
// ============================================================
// Solo sirve el frontend. Los datos se guardan en localStorage.
// Esto es la solución más simple y robusta para Dokploy.
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        mode: 'standalone-localStorage',
        timestamp: new Date().toISOString(),
        message: 'Los datos se guardan en el navegador (localStorage)'
    });
});

// API: Información sobre la app
app.get('/api/info', (req, res) => {
    res.json({
        version: 'v18',
        storage: 'localStorage',
        multiuser: false,
        realtime: false
    });
});

// Servir el frontend estático
app.use(express.static(path.join(__dirname, '..', 'dist')));

// SPA fallback
app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/api.php') {
        return res.status(404).json({ success: false, error: 'Endpoint no encontrado' });
    }
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, HOST, () => {
    console.log('============================================');
    console.log('🐾 ERP Animal — Modo standalone v18');
    console.log('============================================');
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`🌐 Host: ${HOST}`);
    console.log('💾 Almacenamiento: localStorage (en el navegador del usuario)');
    console.log(`🔗 Health: http://${HOST}:${PORT}/api/health`);
    console.log('============================================');
});