// ============================================================
// store.js — Capa de datos unificada (localStorage)
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

window.Store = (() => {
  const PREFIX = 'erp_';
  const listeners = {};

  // ---- Internal helpers ----

  function _key(collection) {
    return PREFIX + collection;
  }

  function _read(collection) {
    try {
      const raw = localStorage.getItem(_key(collection));
      return raw ? JSON.parse(raw) : [];
    } catch {
      console.error(`Error reading collection "${collection}"`);
      return [];
    }
  }

  function _write(collection, data) {
    localStorage.setItem(_key(collection), JSON.stringify(data));
    _emit(collection);
  }

  // ---- Parseo seguro de respuestas del servidor ----
  // Lee la respuesta como texto y valida que sea JSON válido.
  // Si PHP devuelve HTML (warnings, errores), lanza un error descriptivo
  // en lugar de un SyntaxError críptico.
  async function _parseJsonResponse(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      // Detectar si el servidor devolvió HTML (error de PHP)
      const preview = text.substring(0, 200).trim();
      if (preview.startsWith('<') || preview.includes('<br') || preview.includes('<b>')) {
        throw new Error(`El servidor devolvió HTML en lugar de JSON. Posible error de PHP en el servidor.`);
      }
      throw new Error(`Respuesta del servidor no es JSON válido: ${preview}`);
    }
  }

  const API_URL = '/api.php';

  async function _apiCall(action, collection, body = null) {
    try {
      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const res = await fetch(`${API_URL}?action=${action}&collection=${collection}`, options);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const result = await _parseJsonResponse(res);
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }
      return result;
    } catch (err) {
      console.error(`API Error during ${action} on ${collection}:`, err);
      if (window.Helpers && typeof window.Helpers.showToast === 'function') {
        window.Helpers.showToast(`Error de sincronización: ${err.message}`, 'error');
      }
    }
  }

  async function syncFromDatabase() {
    try {
      // Usar un parámetro de tiempo para evitar que los navegadores (especialmente en móviles) cacheen la petición GET
      const res = await fetch(`${API_URL}?action=fetch_all&_t=${new Date().getTime()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP status: ${res.status}`);
      }
      const result = await _parseJsonResponse(res);
      if (result.success && result.data) {
        const collections = Object.keys(ID_PREFIXES);
        collections.forEach(col => {
          if (Array.isArray(result.data[col])) {
            localStorage.setItem(_key(col), JSON.stringify(result.data[col]));
            _emit(col);
          }
        });
        console.log('Database synchronization completed successfully.');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to sync from database:', err);
      if (window.Helpers && typeof window.Helpers.showToast === 'function') {
        window.Helpers.showToast('No se pudo conectar con el servidor. Usando datos locales.', 'warning');
      }
      return false;
    }
  }


  function _emit(collection) {
    if (listeners[collection]) {
      listeners[collection].forEach(fn => fn(_read(collection)));
    }
    // Also emit a global change event
    if (listeners['*']) {
      listeners['*'].forEach(fn => fn(collection));
    }
  }

  // ---- ID generation ----

  const ID_PREFIXES = {
    animals: 'ANI',
    vacunas: 'VAC',
    desparasitaciones: 'DES',
    tratamientos: 'TRA',
    dietas: 'DIE',
    tareas: 'TAR',
    reproduccion: 'REP',
    produccion: 'PRO',
    gastos: 'GAS',
    especies: 'ESP',
  };

  function _nextId(collection) {
    const prefix = ID_PREFIXES[collection] || 'REC';
    const items = _read(collection);
    let max = 0;
    items.forEach(item => {
      if (item.id && item.id.startsWith(prefix + '-')) {
        const num = parseInt(item.id.split('-')[1], 10);
        if (!isNaN(num) && num > max) max = num;
      }
    });
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }

  // ---- Public API ----

  function getAll(collection) {
    return _read(collection);
  }

  function getById(collection, id) {
    return _read(collection).find(item => item.id === id) || null;
  }

  function add(collection, item) {
    const data = _read(collection);
    if (!item.id) {
      item.id = _nextId(collection);
    }
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    item._createdAt = now;
    item._updatedAt = now;
    data.push(item);
    _write(collection, data);
    
    // Sync to remote MySQL database in the background
    _apiCall('create', collection, item);
    
    return item;
  }

  function update(collection, id, updates) {
    const data = _read(collection);
    const index = data.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const updatedItem = { ...data[index], ...updates, _updatedAt: now };
    data[index] = updatedItem;
    _write(collection, data);
    
    // Sync to remote MySQL database in the background
    _apiCall('update', collection, { id, ...updates, _updatedAt: now });
    
    return data[index];
  }

  function remove(collection, id) {
    const data = _read(collection);
    const filtered = data.filter(item => item.id !== id);
    if (filtered.length === data.length) return false;
    _write(collection, filtered);
    
    // Sync delete to remote MySQL database in the background
    _apiCall('delete', collection, { id });
    
    return true;
  }

  function filter(collection, predicate) {
    return _read(collection).filter(predicate);
  }

  function count(collection, predicate) {
    if (!predicate) return _read(collection).length;
    return _read(collection).filter(predicate).length;
  }

  function clear(collection) {
    _write(collection, []);
  }

  // ---- Event system ----

  function on(collection, callback) {
    if (!listeners[collection]) listeners[collection] = [];
    listeners[collection].push(callback);
    return () => {
      listeners[collection] = listeners[collection].filter(fn => fn !== callback);
    };
  }

  // ---- Import / Export ----

  function exportAll() {
    const allData = {};
    const collections = Object.keys(ID_PREFIXES);
    collections.forEach(col => {
      allData[col] = _read(col);
    });
    allData._exportedAt = new Date().toISOString();
    allData._version = '1.0';
    return JSON.stringify(allData, null, 2);
  }

  function importAll(jsonString) {
    try {
      const allData = JSON.parse(jsonString);
      const collections = Object.keys(ID_PREFIXES);
      collections.forEach(col => {
        if (Array.isArray(allData[col])) {
          _write(col, allData[col]);
        }
      });
      
      // Sincronizar importación completa con la base de datos MySQL
      _apiCall('import', '', allData);
      
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  function downloadBackup() {
    const data = exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erp_animal_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---- Species management ----

  function initDefaultSpecies() {
    const existing = _read('especies');
    if (existing.length === 0) {
      const defaults = [
        { id: 'ESP-001', nombre: 'Perro', icono: '🐕', gestacionDias: 63 },
        { id: 'ESP-002', nombre: 'Gato', icono: '🐈', gestacionDias: 65 },
        { id: 'ESP-003', nombre: 'Pájaro', icono: '🐦', gestacionDias: 14 },
        { id: 'ESP-004', nombre: 'Gallina', icono: '🐔', gestacionDias: 21 },
      ];
      _write('especies', defaults);
    }
  }

  return {
    getAll,
    getById,
    add,
    update,
    remove,
    filter,
    count,
    clear,
    on,
    exportAll,
    importAll,
    downloadBackup,
    initDefaultSpecies,
    syncFromDatabase,
  };
})();
