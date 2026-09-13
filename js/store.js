// ============================================================
// store.js — Capa de datos unificada (localStorage)
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

window.Store = (() => {
  const PREFIX = 'erp_';
  const listeners = {};
  let authenticated = false;
  const TOMBSTONES_KEY = `${PREFIX}_tombstones`;

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

  function _readTombstones() {
    try {
      const value = JSON.parse(localStorage.getItem(TOMBSTONES_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function _writeTombstones(tombstones) {
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(tombstones));
  }

  function _queueDeletion(collection, id) {
    const tombstones = _readTombstones().filter(item => !(item.collection === collection && item.id === id));
    tombstones.push({ collection, id, deletedAt: new Date().toISOString() });
    _writeTombstones(tombstones);
  }

  function _resolveDeletion(collection, id) {
    _writeTombstones(_readTombstones().filter(item => item.collection !== collection || item.id !== id));
  }

  // ---- API autenticada ----
  async function _parseJsonResponse(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      const preview = text.substring(0, 200).trim();
      throw new Error(`Respuesta del servidor no es JSON válido: ${preview}`);
    }
  }

  async function _request(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    const result = await _parseJsonResponse(response);
    if (!response.ok || !result.success) {
      const error = new Error(result.error || `HTTP ${response.status}`);
      error.status = response.status;
      if (response.status === 401) authenticated = false;
      throw error;
    }
    return result;
  }

  async function checkSession() {
    try {
      const result = await _request('/api/auth/session');
      authenticated = Boolean(result.authenticated);
      return authenticated;
    } catch {
      authenticated = false;
      return false;
    }
  }

  async function login(password) {
    const result = await _request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    authenticated = result.success;
    return authenticated;
  }

  async function logout() {
    try {
      await _request('/api/auth/logout', { method: 'POST' });
    } finally {
      authenticated = false;
    }
  }

  async function _apiCall(collection, method, body = null, id = null) {
    if (!authenticated) return { success: false, unauthorized: true };
    try {
      const suffix = id ? `/${encodeURIComponent(id)}` : '';
      return await _request(`/api/${collection}${suffix}`, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (err) {
      console.warn(`No se pudo sincronizar ${collection}:`, err.message);
      return { success: false, offline: err.status !== 401, unauthorized: err.status === 401 };
    }
  }

  function _isNewer(left, right) {
    return new Date(left?._updatedAt || 0).getTime() > new Date(right?._updatedAt || 0).getTime();
  }

  async function syncFromDatabase() {
    if (!authenticated) return false;
    try {
      const result = await _request('/api/sync', { cache: 'no-store' });
      const remoteData = result.data || {};
      for (const collection of Object.keys(ID_PREFIXES)) {
        const pendingDeletions = _readTombstones().filter(item => item.collection === collection);
        const deletionResults = await Promise.all(pendingDeletions.map(item => _apiCall(collection, 'DELETE', null, item.id)));
        deletionResults.forEach((result, index) => {
          if (result.success) _resolveDeletion(collection, pendingDeletions[index].id);
        });
        const deletedIds = new Set(pendingDeletions.map(item => item.id));
        const local = _read(collection).filter(record => !deletedIds.has(record.id));
        const byId = new Map((remoteData[collection] || [])
          .filter(record => !deletedIds.has(record.id))
          .map(record => [record.id, record]));
        const pending = [];
        for (const record of local) {
          const remote = byId.get(record.id);
          if (!remote || _isNewer(record, remote)) {
            byId.set(record.id, record);
            pending.push(_apiCall(collection, 'POST', record));
          }
        }
        _write(collection, Array.from(byId.values()));
        await Promise.all(pending);
      }
      return true;
    } catch (err) {
      console.warn('No se pudo sincronizar con el servidor:', err.message);
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
    
    _apiCall(collection, 'POST', item);
    
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
    
    // Se envía el registro completo: el backend nunca sustituye campos por un parche.
    _apiCall(collection, 'POST', updatedItem);
    
    return data[index];
  }

  function remove(collection, id) {
    const data = _read(collection);
    const filtered = data.filter(item => item.id !== id);
    if (filtered.length === data.length) return false;
    _write(collection, filtered);
    
    _queueDeletion(collection, id);
    _apiCall(collection, 'DELETE', null, id).then(result => {
      if (result.success) _resolveDeletion(collection, id);
    });
    
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
      
      if (authenticated) {
        _request('/api/import', {
          method: 'POST',
          body: JSON.stringify(allData),
        }).catch(err => console.warn('No se pudo sincronizar el backup:', err.message));
      }
      
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
    checkSession,
    login,
    logout,
    isAuthenticated: () => authenticated,
  };
})();
