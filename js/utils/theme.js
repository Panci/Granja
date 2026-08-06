// ============================================================
// theme.js — Gestor de tema día/noche
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

window.Theme = (() => {
  const STORAGE_KEY = 'erp_theme';
  const VALID = ['dark', 'light'];

  function _systemPref() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function get() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VALID.includes(stored)) return stored;
    } catch {
      /* localStorage no disponible */
    }
    return _systemPref();
  }

  function apply(theme) {
    const value = VALID.includes(theme) ? theme : _systemPref();
    document.documentElement.setAttribute('data-theme', value);
    document.body.setAttribute('data-theme', value);
    _notifyButtons(value);
    return value;
  }

  function set(theme) {
    const value = VALID.includes(theme) ? theme : _systemPref();
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* sin persistencia */
    }
    return apply(value);
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    return set(current === 'dark' ? 'light' : 'dark');
  }

  function _notifyButtons(theme) {
    const next = theme === 'dark' ? '☀️' : '🌙';
    const label = theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      const icon = btn.querySelector('[data-theme-icon]');
      if (icon) icon.textContent = next;
      const label = btn.querySelector('[data-theme-label]');
      if (label) label.textContent = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
    });
    // Botón estático del HTML inicial (id=themeFabStatic)
    const staticIcon = document.getElementById('themeFabStaticIcon');
    if (staticIcon) staticIcon.textContent = next;
    const staticBtn = document.getElementById('themeFabStatic');
    if (staticBtn) {
      staticBtn.setAttribute('aria-label', label);
      staticBtn.setAttribute('title', label);
    }
  }

  // Inicializa el tema en el HTML antes del primer render para evitar
  // un "flash" del tema oscuro por defecto.
  function init() {
    const theme = get();
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }

  return { init, get, set, apply, toggle };
})();
