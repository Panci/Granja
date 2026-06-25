// ============================================================
// app.js — Controlador Principal y Dashboard
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

const App = (() => {

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
    await Store.syncFromDatabase();
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
    `;
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

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${module}`);
    if (activeNav) activeNav.classList.add('active');

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
        ${overdueTasks.map(t => `<div class="alert alert-warning"><span class="alert-icon">📋</span><span class="alert-text">Tarea pendiente: ${t.titulo}</span></div>`).join('')}
        ${gestaciones.map(g => {
          const h = Store.getById('animals', g.hembra);
          const days = Helpers.daysUntil(g.fechaEstimadaParto);
          return `<div class="alert alert-info"><span class="alert-icon">🐣</span><span class="alert-text">${h ? h.nombre : g.hembra}: Parto estimado en ${days > 0 ? days + ' días' : days === 0 ? '¡Hoy!' : Math.abs(days) + ' días atrás'}</span></div>`;
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
            { label: 'Nombre', render: r => `<strong>${r.nombre}</strong>` },
            { label: 'Especie', render: r => `${Helpers.speciesIcon(r.especie)} ${r.especie}` },
            { label: 'Estado', render: r => Helpers.estadoBadge(r.estado) },
            { label: 'Edad', render: r => Helpers.calcAge(r.fechaNacimiento) },
          ], recentAnimals, { emptyIcon: '🐾', emptyText: 'No hay animales registrados' })}
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
    const alerts = [];
    Store.getAll('vacunas').forEach(v => {
      if (!v.proximaDosis) return;
      const days = Helpers.daysUntil(v.proximaDosis);
      const animal = Store.getById('animals', v.animalId);
      const name = animal ? animal.nombre : v.animalId;
      if (days !== null && days < 0) {
        alerts.push({ type: 'danger', icon: '💉', text: `${name}: Vacuna "${v.tipo}" vencida hace ${Math.abs(days)} días` });
      } else if (days !== null && days <= 7) {
        alerts.push({ type: 'warning', icon: '💉', text: `${name}: Vacuna "${v.tipo}" en ${days} día${days !== 1 ? 's' : ''}` });
      }
    });
    Store.getAll('desparasitaciones').forEach(d => {
      if (!d.proximaAplicacion) return;
      const days = Helpers.daysUntil(d.proximaAplicacion);
      const animal = Store.getById('animals', d.animalId);
      const name = animal ? animal.nombre : d.animalId;
      if (days !== null && days < 0) {
        alerts.push({ type: 'danger', icon: '🧴', text: `${name}: Desparasitación vencida hace ${Math.abs(days)} días` });
      } else if (days !== null && days <= 7) {
        alerts.push({ type: 'warning', icon: '🧴', text: `${name}: Desparasitación en ${days} día${days !== 1 ? 's' : ''}` });
      }
    });
    Store.getAll('tratamientos').forEach(t => {
      if (t.estado !== 'Activo') return;
      const animal = Store.getById('animals', t.animalId);
      const name = animal ? animal.nombre : t.animalId;
      alerts.push({ type: 'info', icon: '💊', text: `${name}: Tratamiento activo — ${t.medicamento}` });
    });
    return alerts;
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

  return { init, navigateTo, refreshModule, exportData, importData };
})();

// ---- Boot ----
document.addEventListener('DOMContentLoaded', App.init);
