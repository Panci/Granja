// ============================================================
// finanzas.js — Módulo 6: Control Financiero
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

window.Finanzas = (() => {

  const CATEGORIAS = ['Comida', 'Veterinario', 'Medicamentos', 'Infraestructura', 'Gastos Generales'];

  let filterMonth = null; // null = current month
  let filterGrupo = '';
  let filterCategoria = '';
  let searchTerm = '';
  let currentPage = 1;
  const PAGE_SIZE = 25;

  function render() {
    const { year, month } = filterMonth || Helpers.currentMonth();
    const gastos = _getFiltered(year, month);
    const allMonth = _getMonth(year, month);
    const totalMes = allMonth.reduce((s, g) => s + (g.monto || 0), 0);

    // Per-group totals
    const species = Helpers.getSpecies();
    const byGrupo = {};
    species.forEach(sp => { byGrupo[sp.nombre] = 0; });
    byGrupo['General'] = 0;
    allMonth.forEach(g => {
      const key = g.grupo || 'General';
      byGrupo[key] = (byGrupo[key] || 0) + (g.monto || 0);
    });

    // Per-category totals
    const byCat = {};
    CATEGORIAS.forEach(c => { byCat[c] = 0; });
    allMonth.forEach(g => { byCat[g.categoria] = (byCat[g.categoria] || 0) + (g.monto || 0); });

    const statsHtml = `
      ${Charts.statCard(Helpers.formatMoney(totalMes), `Total ${Helpers.monthName(month)}`, '💰', '#fbbf24')}
      ${species.map(sp => Charts.statCard(Helpers.formatMoney(byGrupo[sp.nombre] || 0), sp.nombre, sp.icono, Charts.COLORS[species.indexOf(sp)])).join('')}
    `;

    // Charts
    const donutData = CATEGORIAS.map((c, i) => ({ label: c, value: byCat[c] || 0 }));
    const grupoBarData = species.map(sp => ({ label: sp.nombre, value: byGrupo[sp.nombre] || 0 }));
    if (byGrupo['General'] > 0) grupoBarData.push({ label: 'General', value: byGrupo['General'] });

    return `
      <div class="module-header">
        <div>
          <h1 class="module-title">💰 Control Financiero</h1>
          <p class="module-subtitle">Gastos de ${Helpers.monthName(month)} ${year}</p>
        </div>
        <div class="module-actions">
          <button class="btn btn-primary" onclick="Finanzas.openForm()">
            <span class="btn-icon">＋</span> Registrar Gasto
          </button>
        </div>
      </div>

      <div class="stats-grid">${statsHtml}</div>

      <div class="charts-row">
        <div class="card chart-card">
          <div class="card-header"><h3 class="card-title">Por Categoría</h3></div>
          <div class="card-body">
            ${Charts.donutChart(donutData, { centerText: Helpers.formatMoney(totalMes), centerSubText: 'Total' })}
          </div>
        </div>
        <div class="card chart-card">
          <div class="card-header"><h3 class="card-title">Por Grupo</h3></div>
          <div class="card-body">
            ${Charts.barChart(grupoBarData, { height: 240, label: 'Gastos por grupo' })}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">📋 Detalle de Gastos</h2>
          <div class="filter-bar">
            ${Helpers.renderSearchBox('�� Buscar por descripción, categoría...', 'finanzasSearch')}
            <input type="month" class="form-input form-input-sm" value="${year}-${String(month + 1).padStart(2, '0')}" onchange="Finanzas.setMonth(this.value)">
            <select class="form-input form-input-sm" onchange="Finanzas.setFilter('grupo', this.value)">
              <option value="">Todos los grupos</option>
              ${species.map(sp => `<option value="${Helpers.escapeHtml(sp.nombre)}" ${filterGrupo === sp.nombre ? 'selected' : ''}>${Helpers.escapeHtml(sp.icono)} ${Helpers.escapeHtml(sp.nombre)}</option>`).join('')}
            </select>
            <select class="form-input form-input-sm" onchange="Finanzas.setFilter('categoria', this.value)">
              <option value="">Todas las categorías</option>
              ${CATEGORIAS.map(c => `<option value="${c}" ${filterCategoria === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="card-body">
          ${_renderTable(gastos)}
        </div>
      </div>
    `;
  }

  function _getMonth(year, month) {
    return Store.filter('gastos', g => {
      const d = new Date(g.fecha);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  function _getFiltered(year, month) {
    return Store.filter('gastos', g => {
      const d = new Date(g.fecha);
      if (d.getFullYear() !== year || d.getMonth() !== month) return false;
      if (filterGrupo && g.grupo !== filterGrupo) return false;
      if (filterCategoria && g.categoria !== filterCategoria) return false;
      return true;
    });
  }

  function _renderTable(gastos) {
    let sorted = [...gastos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    sorted = Helpers.applySearch(sorted, searchTerm, ['descripcion', 'categoria', 'grupo']);
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const pageRows = sorted.slice(startIdx, startIdx + PAGE_SIZE);

    return Helpers.renderTable([
      { label: 'Fecha', render: r => Helpers.formatDate(r.fecha) },
      { label: 'Grupo', render: r => r.grupo ? `${Helpers.speciesIcon(r.grupo)} ${Helpers.escapeHtml(r.grupo)}` : '�� General' },
      { label: 'Categoría', render: r => Helpers.badge(r.categoria, _catColor(r.categoria)) },
      { label: 'Descripción', key: 'descripcion' },
      { label: 'Monto', render: r => `<strong class="money-value">${Helpers.formatMoney(r.monto)}</strong>` },
    ], pageRows, {
      emptyIcon: '��',
      emptyText: searchTerm ? 'Sin resultados para la búsqueda' : 'No hay gastos registrados en este periodo',
      actions: row => `
        <button class="btn-icon-action" title="Editar" onclick="Finanzas.openForm(${Helpers.jsArg(row.id)})">✏️</button>
        <button class="btn-icon-action" title="Eliminar" onclick="Finanzas.confirmDelete(${Helpers.jsArg(row.id)})">��️</button>
      `,
    }) + Helpers.renderPagination(currentPage, totalPages, 'Finanzas.goToPage');
  }

  function _catColor(cat) {
    const map = {
      'Comida': 'success',
      'Veterinario': 'info',
      'Medicamentos': 'warning',
      'Infraestructura': 'neutral',
      'Gastos Generales': 'neutral',
    };
    return map[cat] || 'neutral';
  }

  function openForm(id) {
    const existing = id ? Store.getById('gastos', id) : null;
    const isEdit = !!existing;
    const species = Helpers.getSpecies();

    const html = `
      <form class="form-grid" id="gastoForm">
        <div class="form-group">
          <label class="form-label">Fecha *</label>
          <input class="form-input" type="date" id="f_fecha" value="${existing ? Helpers.toInputDate(existing.fecha) : Helpers.today()}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Grupo (Especie)</label>
          <select class="form-input" id="f_grupo">
            <option value="">🏠 General</option>
            ${species.map(sp => `<option value="${Helpers.escapeHtml(sp.nombre)}" ${existing?.grupo === sp.nombre ? 'selected' : ''}>${Helpers.escapeHtml(sp.icono)} ${Helpers.escapeHtml(sp.nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Categoría *</label>
          <select class="form-input" id="f_categoria">
            ${CATEGORIAS.map(c => `<option value="${c}" ${existing?.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Monto (€) *</label>
          <input class="form-input" type="number" step="0.01" min="0" id="f_monto" value="${existing?.monto ?? ''}" placeholder="0.00" required>
        </div>
        <div class="form-group form-full">
          <label class="form-label">Descripción</label>
          <input class="form-input" id="f_descripcion" value="${existing ? Helpers.escapeHtml(existing.descripcion) : ''}" placeholder="Ej: Saco de pienso 15kg">
        </div>
      </form>
    `;

    Helpers.openModal(isEdit ? 'Editar Gasto' : 'Registrar Gasto', html, {
      onSubmit: (overlay) => {
        const monto = parseFloat(overlay.querySelector('#f_monto').value);
        if (isNaN(monto) || monto < 0) { Helpers.showToast('Indica un monto válido', 'error'); return false; }

        const data = {
          fecha: overlay.querySelector('#f_fecha').value,
          grupo: overlay.querySelector('#f_grupo').value || null,
          categoria: overlay.querySelector('#f_categoria').value,
          monto,
          descripcion: overlay.querySelector('#f_descripcion').value.trim(),
        };

        if (isEdit) {
          Store.update('gastos', id, data);
          Helpers.showToast('Gasto actualizado');
        } else {
          Store.add('gastos', data);
          Helpers.showToast('Gasto registrado');
        }
        App.refreshModule();
      },
    });
  }

  function confirmDelete(id) {
    Helpers.confirmDialog('¿Eliminar este gasto?', () => {
      Store.remove('gastos', id);
      Helpers.showToast('Gasto eliminado', 'warning');
      App.refreshModule();
    });
  }

  function setMonth(val) {
    if (val) {
      const [y, m] = val.split('-').map(Number);
      filterMonth = { year: y, month: m - 1 };
    } else {
      filterMonth = null;
    }
    currentPage = 1;
    App.refreshModule();
  }

  function setFilter(key, val) {
    if (key === 'grupo') filterGrupo = val;
    if (key === 'categoria') filterCategoria = val;
    currentPage = 1;
    App.refreshModule();
  }

  function setSearch(term) {
    searchTerm = term;
    currentPage = 1;
    App.refreshModule();
  }

  function goToPage(page) {
    currentPage = Math.max(1, page);
    App.refreshModule();
  }

  return { render, openForm, confirmDelete, setMonth, setFilter, setSearch, goToPage };
})();
