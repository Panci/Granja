// ============================================================
// app.js — Controlador Principal y Dashboard
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

window.App = (() => {

  let currentModule = 'dashboard';

  const MODULES = {
    dashboard: { label: 'Dashboard', icon: '📊', section: 'general' },
    inventario: { label: 'Inventario', icon: '🐾', section: 'gestion' },
    salud: { label: 'Salud', icon: '🏥', section: 'gestion' },
    alimentacion: { label: 'Alimentación', icon: '🥣', section: 'gestion' },
    reproduccion: { label: 'Reproducción', icon: '🐣', section: 'gestion' },
    produccion: { label: 'Producción', icon: '🥚', section: 'produccion' },
    finanzas: { label: 'Finanzas', icon: '💰', section: 'produccion' },
  };

  async function init() {
    // Intentar sincronizar con BD, pero continuar si falla
    try {
      await Store.syncFromDatabase();
    } catch (e) {
      console.log('📦 Modo offline - usando localStorage');
    }
    Store.initDefaultSpecies();
    _renderShell();
    navigateTo('dashboard');
    _bindSidebarToggle();
  }

  function _renderShell() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <button class="sidebar-toggle" id="sidebarToggle">☰</button>
      <div class="sidebar-overlay" id="sidebarOverlay"></div>

      <div class="app-layout">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <span class="sidebar-logo">🐾</span>
            <div class="sidebar-brand">
              <span class="sidebar-brand-name">ERP Animal</span>
              <span class="sidebar-brand-sub">Gestión Veterinaria</span>
            </div>
          </div>

          <nav class="sidebar-nav">
            <div class="nav-section-title">General</div>
            ${_navItem('dashboard')}

            <div class="nav-section-title">Gestión</div>
            ${_navItem('inventario')}
            ${_navItem('salud')}
            ${_navItem('alimentacion')}
            ${_navItem('reproduccion')}

            <div class="nav-section-title">Producción y Finanzas</div>
            ${_navItem('produccion')}
            ${_navItem('finanzas')}
          </nav>

          <div class="sidebar-footer">
            <div class="nav-item" onclick="App.exportData()">
              <span class="nav-icon">💾</span>
              <span class="nav-label">Exportar Datos</span>
            </div>
            <div class="nav-item" onclick="App.importData()">
              <span class="nav-icon">📂</span>
              <span class="nav-label">Importar Datos</span>
            </div>
          </div>
        </aside>

        <main class="main-content" id="mainContent">
        </main>
      </div>

      <!-- Barra de navegación inferior (móvil) -->
      <nav class="bottom-nav" id="bottomNav">
        <div class="bottom-nav-item ${currentModule === 'dashboard' ? 'active' : ''}" onclick="App.navigateTo('dashboard')" id="bnav-dashboard">
          <span class="bottom-nav-icon">📊</span>
          <span class="bottom-nav-label">Inicio</span>
        </div>
        <div class="bottom-nav-item ${currentModule === 'inventario' ? 'active' : ''}" onclick="App.navigateTo('inventario')" id="bnav-inventario">
          <span class="bottom-nav-icon">🐾</span>
          <span class="bottom-nav-label">Animales</span>
        </div>
        <div class="bottom-nav-item ${currentModule === 'salud' ? 'active' : ''}" onclick="App.navigateTo('salud')" id="bnav-salud">
          <span class="bottom-nav-icon">🏥</span>
          <span class="bottom-nav-label">Salud</span>
        </div>
        <div class="bottom-nav-item ${currentModule === 'alimentacion' ? 'active' : ''}" onclick="App.navigateTo('alimentacion')" id="bnav-alimentacion">
          <span class="bottom-nav-icon">🥣</span>
          <span class="bottom-nav-label">Alimentos</span>
        </div>
        <div class="bottom-nav-item ${currentModule === 'produccion' ? 'active' : ''}" onclick="App.navigateTo('produccion')" id="bnav-produccion">
          <span class="bottom-nav-icon">🥚</span>
          <span class="bottom-nav-label">Producción</span>
        </div>
        <button class="bottom-nav-more" id="bottomNavMore" onclick="App.toggleMobileMenu()" aria-label="Más opciones">
          <span class="bottom-nav-icon">⋯</span>
          <span class="bottom-nav-label">Más</span>
        </button>
      </nav>

      <!-- Menú extra para móvil (Reproducción, Finanzas, Sync) -->
      <div class="mobile-menu-overlay" id="mobileMenuOverlay" onclick="App.closeMobileMenu()"></div>
      <div class="mobile-menu" id="mobileMenu">
        <div class="mobile-menu-header">
          <span>Más opciones</span>
          <button class="mobile-menu-close" onclick="App.closeMobileMenu()">✕</button>
        </div>
        <div class="mobile-menu-item ${currentModule === 'reproduccion' ? 'active' : ''}" onclick="App.navigateTo('reproduccion'); App.closeMobileMenu();">
          <span class="mobile-menu-icon">🐣</span>
          <span class="mobile-menu-label">Reproducción</span>
        </div>
        <div class="mobile-menu-item ${currentModule === 'finanzas' ? 'active' : ''}" onclick="App.navigateTo('finanzas'); App.closeMobileMenu();">
          <span class="mobile-menu-icon">💰</span>
          <span class="mobile-menu-label">Finanzas</span>
        </div>
        <div class="mobile-menu-divider"></div>
        <div class="mobile-menu-item" onclick="App.exportData(); App.closeMobileMenu();">
          <span class="mobile-menu-icon">💾</span>
          <span class="mobile-menu-label">Exportar Datos</span>
        </div>
        <div class="mobile-menu-item" onclick="App.importData(); App.closeMobileMenu();">
          <span class="mobile-menu-icon">📂</span>
          <span class="mobile-menu-label">Importar Datos</span>
        </div>
      </div>
    `;
  }

  function toggleMobileMenu() {
    const overlay = document.getElementById('mobileMenuOverlay');
    const menu = document.getElementById('mobileMenu');
    if (overlay && menu) {
      overlay.classList.toggle('active');
      menu.classList.toggle('active');
    }
  }

  function closeMobileMenu() {
    const overlay = document.getElementById('mobileMenuOverlay');
    const menu = document.getElementById('mobileMenu');
    if (overlay && menu) {
      overlay.classList.remove('active');
      menu.classList.remove('active');
    }
  }

  function _navItem(key) {
    const m = MODULES[key];
    return `<div class="nav-item ${currentModule === key ? 'active' : ''}" onclick="App.navigateTo('${key}')" id="nav-${key}">
      <span class="nav-icon">${m.icon}</span>
      <span class="nav-label">${m.label}</span>
    </div>`;
  }

  function navigateTo(module) {
    currentModule = module;

    // Update nav active state (sidebar)
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${module}`);
    if (activeNav) activeNav.classList.add('active');

    // Update nav active state (bottom nav)
    document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
    const activeBottomNav = document.getElementById(`bnav-${module}`);
    if (activeBottomNav) activeBottomNav.classList.add('active');

    // Update nav active state (mobile menu)
    document.querySelectorAll('.mobile-menu-item').forEach(el => el.classList.remove('active'));
    const allItems = document.querySelectorAll('.mobile-menu-item');
    allItems.forEach((item, idx) => {
      // Reproducción es el primer item, Finanzas el segundo
      if ((idx === 0 && module === 'reproduccion') || (idx === 1 && module === 'finanzas')) {
        item.classList.add('active');
      }
    });

    // Close mobile sidebar
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('sidebar-open');
    if (overlay) overlay.classList.remove('active');

    refreshModule();
  }

  function refreshModule() {
    const main = document.getElementById('mainContent');
    if (!main) return;

    let html = '';
    switch (currentModule) {
      case 'dashboard': html = _renderDashboard(); break;
      case 'inventario': html = Inventario.render(); break;
      case 'salud': html = Salud.render(); break;
      case 'alimentacion': html = Alimentacion.render(); break;
      case 'reproduccion': html = Reproduccion.render(); break;
      case 'produccion': html = Produccion.render(); break;
      case 'finanzas': html = Finanzas.render(); break;
    }
    main.innerHTML = html;

    // Vincula listeners delegados tras inyectar HTML
    _bindDelegatedListeners();
  }

  // ---- Tablas de mapeo (declaradas antes de los listeners para evitar TDZ) ----
  const _SEARCH_HANDLERS = {
    inventarioSearch: (v) => Inventario.setSearch(v),
    saludSearch: (v) => Salud.setSearch(v),
    finanzasSearch: (v) => Finanzas.setSearch(v),
    reproduccionSearch: (v) => Reproduccion.setSearch(v),
    produccionSearch: (v) => Produccion.setSearch(v),
    alimentacionSearch: (v) => Alimentacion.setSearch(v),
  };

  const _PAGINATION_HANDLERS = [
    { id: '#inventarioSearch', fn: (p) => Inventario.goToPage(p) },
    { id: '#saludSearch', fn: (p) => Salud.goToPage(p) },
    { id: '#finanzasSearch', fn: (p) => Finanzas.goToPage(p) },
    { id: '#reproduccionSearch', fn: (p) => Reproduccion.goToPage(p) },
    { id: '#produccionSearch', fn: (p) => Produccion.goToPage(p) },
    { id: '#alimentacionSearch', fn: (p) => Alimentacion.goToPage(p) },
  ];

  // ---- Event delegation ----
  // Reemplaza bloques script inline y enlaces onclick dispersos en el HTML
  // generado. Permite CSP estricta y un único punto de mantenimiento.
  function _bindDelegatedListeners() {
    const main = document.getElementById('mainContent');
    if (!main || main.__delegated) return;
    main.__delegated = true;

    main.addEventListener('change', (e) => {
      const t = e.target;
      if (!t) return;
      if (t.id === 'filterAnimalSalud') {
        Salud.setFilterAnimal(t.value);
      }
    });

    // Debounced input para búsqueda en tablas
    let searchTimer = null;
    main.addEventListener('input', (e) => {
      const t = e.target;
      if (!t) return;
      const handler = _SEARCH_HANDLERS[t.id];
      if (handler) {
        clearTimeout(searchTimer);
        const value = t.value;
        searchTimer = setTimeout(() => handler(value), 200);
      }
    });

    // Paginación
    main.addEventListener('click', (e) => {
      const btn = e.target.closest('.page-btn');
      if (!btn || btn.disabled) return;
      const page = parseInt(btn.dataset.page, 10);
      if (isNaN(page)) return;
      const card = btn.closest('.card');
      if (!card) return;
      const handler = _PAGINATION_HANDLERS.find(h => card.querySelector(h.id));
      if (handler) handler.fn(page);
    });
  }

  // Handler global para paginación (compatibilidad con onclick inline)
  function handlePageClick(btn, callback) {
    if (btn.disabled) return;
    const page = parseInt(btn.dataset.page, 10);
    if (isNaN(page)) return;
    const [scope, fn] = callback.split('.');
    if (window[scope] && typeof window[scope][fn] === 'function') {
      window[scope][fn](page);
    }
  }

  // Restablece el flag de delegación tras reconstruir el shell
  // (por ejemplo, después de importar datos).
  function _resetDelegatedFlag() {
    const main = document.getElementById('mainContent');
    if (main) main.__delegated = false;
  }

  // ---- Dashboard ----

  function _renderDashboard() {
    const animals = Store.getAll('animals');
    const species = Helpers.getSpecies();
    const activeAnimals = animals.filter(a => a.estado === 'Activo');

    // Stats
    const statsHtml = species.map((sp, i) => {
      const count = activeAnimals.filter(a => a.especie === sp.nombre).length;
      return Charts.statCard(count, sp.nombre, sp.icono, Charts.COLORS[i]);
    }).join('');

    // Health alerts
    const healthAlerts = _getHealthAlerts();

    // Today's production
    const todayProd = Store.filter('produccion', r => r.fecha === Helpers.today());
    const todayEggs = todayProd.reduce((s, r) => s + r.cantidad, 0);

    // Monthly expenses
    const { year, month } = Helpers.currentMonth();
    const monthExpenses = Store.filter('gastos', g => {
      const d = new Date(g.fecha);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const totalGastos = monthExpenses.reduce((s, g) => s + (g.monto || 0), 0);

    // Pending tasks
    const pendingTasks = Store.filter('tareas', t => t.estado !== 'Completada');
    const overdueTasks = pendingTasks.filter(t => {
      if (!t.proximaEjecucion) return false;
      return Helpers.daysUntil(t.proximaEjecucion) < 0;
    });

    // Active gestations
    const gestaciones = Store.filter('reproduccion', r => r.estado === 'En gestación');

    // Recent activity (last 5 animals added)
    const recentAnimals = [...animals].sort((a, b) =>
      new Date(b._createdAt || 0) - new Date(a._createdAt || 0)
    ).slice(0, 5);

    // Expense by category chart
    const gastosByCat = {};
    ['Comida', 'Veterinario', 'Medicamentos', 'Infraestructura', 'Gastos Generales'].forEach(c => gastosByCat[c] = 0);
    monthExpenses.forEach(g => { gastosByCat[g.categoria] = (gastosByCat[g.categoria] || 0) + g.monto; });
    const donutData = Object.entries(gastosByCat).map(([label, value]) => ({ label, value }));

    // Egg production last 7 days
    const eggData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const reg = Store.filter('produccion', r => r.fecha === dateStr);
      eggData.push({
        label: d.toLocaleDateString('es-ES', { weekday: 'short' }),
        value: reg.reduce((s, r) => s + r.cantidad, 0),
      });
    }

    return `
      <div class="dashboard-welcome">
        <h1>🐾 Panel de Control</h1>
        <p>Bienvenido a ERP Animal — ${Helpers.formatDate(Helpers.today())}</p>
        <div class="dashboard-quick-actions">
          <button class="btn btn-primary" onclick="App.navigateTo('inventario'); setTimeout(() => Inventario.openForm(), 100)">＋ Animal</button>
          <button class="btn btn-ghost" onclick="App.navigateTo('salud'); setTimeout(() => Salud.openForm(), 100)">💉 Vacuna</button>
          <button class="btn btn-ghost" onclick="App.navigateTo('produccion')">🥚 Producción</button>
          <button class="btn btn-ghost" onclick="App.navigateTo('finanzas'); setTimeout(() => Finanzas.openForm(), 100)">💰 Gasto</button>
        </div>
      </div>

      <div class="stats-grid">
        ${Charts.statCard(activeAnimals.length, 'Total Activos', '🐾', '#4ade80')}
        ${statsHtml}
        ${Charts.statCard(todayEggs, 'Huevos Hoy', '🥚', '#fbbf24')}
        ${Charts.statCard(Helpers.formatMoney(totalGastos), `Gastos ${Helpers.monthName(month)}`, '💰', '#f472b6')}
      </div>

      ${healthAlerts.length > 0 || overdueTasks.length > 0 || gestaciones.length > 0 ? `
      <div class="alerts-panel">
        <h3 class="alerts-title">⚡ Atención Requerida</h3>
        ${healthAlerts.map(a => `<div class="alert alert-${a.type}"><span class="alert-icon">${a.icon}</span><span class="alert-text">${a.text}</span></div>`).join('')}
        ${overdueTasks.map(t => `<div class="alert alert-warning"><span class="alert-icon">��</span><span class="alert-text">Tarea pendiente: ${Helpers.escapeHtml(t.titulo)}</span></div>`).join('')}
        ${gestaciones.map(g => {
          const h = Store.getById('animals', g.hembra);
          const days = Helpers.daysUntil(g.fechaEstimadaParto);
          const hembraName = h ? Helpers.escapeHtml(h.nombre) : Helpers.escapeHtml(g.hembra);
          return `<div class="alert alert-info"><span class="alert-icon">��</span><span class="alert-text">${hembraName}: Parto estimado en ${days > 0 ? days + ' días' : days === 0 ? '¡Hoy!' : Math.abs(days) + ' días atrás'}</span></div>`;
        }).join('')}
      </div>` : ''}

      <div class="dashboard-grid">
        <div class="card chart-card">
          <div class="card-header"><h3 class="card-title">🥚 Producción (7 días)</h3></div>
          <div class="card-body">
            ${Charts.barChart(eggData, { height: 200, barColor: '#fbbf24' })}
          </div>
        </div>
        <div class="card chart-card">
          <div class="card-header"><h3 class="card-title">💰 Gastos del Mes</h3></div>
          <div class="card-body">
            ${Charts.donutChart(donutData, { size: 180, centerText: Helpers.formatMoney(totalGastos), centerSubText: Helpers.monthName(month) })}
          </div>
        </div>
      </div>

      ${recentAnimals.length > 0 ? `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🕐 Últimos Animales Registrados</h3>
          <button class="btn btn-ghost btn-sm" onclick="App.navigateTo('inventario')">Ver todos →</button>
        </div>
        <div class="card-body">
          ${Helpers.renderTable([
            { label: 'ID', key: 'id' },
            { label: 'Nombre', render: r => `<strong>${Helpers.escapeHtml(r.nombre)}</strong>` },
            { label: 'Especie', render: r => `${Helpers.speciesIcon(r.especie)} ${Helpers.escapeHtml(r.especie)}` },
            { label: 'Estado', render: r => Helpers.estadoBadge(r.estado) },
            { label: 'Edad', render: r => Helpers.calcAge(r.fechaNacimiento) },
          ], recentAnimals, { emptyIcon: '\u{1F43E}', emptyText: 'No hay animales registrados' })}
        </div>
      </div>` : `
      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            <div class="empty-state-icon">🚀</div>
            <p class="empty-state-text">¡Comienza registrando tu primer animal!</p>
            <button class="btn btn-primary" onclick="App.navigateTo('inventario'); setTimeout(() => Inventario.openForm(), 100)" style="margin-top:1rem;">＋ Registrar Animal</button>
          </div>
        </div>
      </div>
      `}
    `;
  }

  function _getHealthAlerts() {
    return Helpers.getHealthAlerts();
  }

  // ---- Sidebar toggle ----

  function _bindSidebarToggle() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggle) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-open');
        overlay.classList.toggle('active');
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('sidebar-open');
        overlay.classList.remove('active');
      });
    }
  }

  // ---- Data import/export ----

  function exportData() {
    Store.downloadBackup();
    Helpers.showToast('Backup descargado correctamente', 'success');
  }

  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const success = Store.importAll(ev.target.result);
        if (success) {
          Helpers.showToast('Datos importados correctamente', 'success');
          _renderShell();
          _resetDelegatedFlag();
          navigateTo(currentModule);
          _bindSidebarToggle();
        } else {
          Helpers.showToast('Error al importar los datos', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return { init, navigateTo, refreshModule, exportData, importData, handlePageClick };
})();

// ---- Boot ----
document.addEventListener('DOMContentLoaded', App.init);
