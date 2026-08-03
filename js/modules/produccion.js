// ============================================================
// produccion.js — Módulo 5: Control de Producción
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

window.Produccion = (() => {

  let viewPeriod = 'semanal';
  let searchTerm = '';
  let currentPage = 1;
  const PAGE_SIZE = 25;

  function render() {
    const registros = Store.getAll('produccion');
    const todayStr = Helpers.today();
    const todayReg = registros.find(r => r.fecha === todayStr);
    const todayCount = todayReg ? todayReg.cantidad : 0;

    // Stats
    const last7 = _getLast(7, registros);
    const last30 = _getLast(30, registros);
    const avg7 = last7.length > 0 ? (last7.reduce((s, r) => s + r.cantidad, 0) / 7).toFixed(1) : 0;
    const total30 = last30.reduce((s, r) => s + r.cantidad, 0);
    const bestDay = registros.length > 0 ? registros.reduce((max, r) => r.cantidad > max.cantidad ? r : max, registros[0]) : null;

    return `
      <div class="module-header">
        <div>
          <h1 class="module-title">🥚 Control de Producción</h1>
          <p class="module-subtitle">Registro de huevos y producción diaria</p>
        </div>
      </div>

      <div class="stats-grid">
        ${Charts.statCard(todayCount, 'Hoy', '🥚', '#fbbf24')}
        ${Charts.statCard(avg7, 'Media diaria (7d)', '📊', '#4ade80')}
        ${Charts.statCard(total30, 'Total (30 días)', '📦', '#60a5fa')}
        ${Charts.statCard(bestDay ? bestDay.cantidad : 0, bestDay ? `Mejor día (${Helpers.formatDateShort(bestDay.fecha)})` : 'Mejor día', '🏆', '#f472b6')}
      </div>

      <!-- Quick register -->
      <div class="card quick-register-card">
        <div class="quick-register">
          <h2 class="card-title">Registro rápido — ${Helpers.formatDate(todayStr)}</h2>
          <div class="quick-counter">
            <button class="counter-btn counter-minus" onclick="Produccion.quickAdjust(-1)">−</button>
            <span class="counter-value" id="quickCount">${todayCount}</span>
            <button class="counter-btn counter-plus" onclick="Produccion.quickAdjust(1)">＋</button>
          </div>
          <div class="quick-actions">
            <button class="btn btn-ghost btn-sm" onclick="Produccion.quickSet(0)">Reset</button>
            <button class="btn btn-ghost btn-sm" onclick="Produccion.openForm()">📅 Otro día</button>
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">📈 Gráfico de Producción</h2>
          <div class="filter-bar">
            <select class="form-input form-input-sm" onchange="Produccion.setViewPeriod(this.value)">
              <option value="semanal" ${viewPeriod === 'semanal' ? 'selected' : ''}>Última semana</option>
              <option value="mensual" ${viewPeriod === 'mensual' ? 'selected' : ''}>Último mes</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          ${_renderChart(registros)}
        </div>
      </div>

      <!-- History table -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">�� Historial</h2>
          <div class="filter-bar">
            ${Helpers.renderSearchBox('�� Buscar por fecha, tipo, notas...', 'produccionSearch')}
          </div>
        </div>
        <div class="card-body">
          ${_renderHistory(registros)}
        </div>
      </div>
    `;
  }

  function _getLast(days, registros) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return registros.filter(r => new Date(r.fecha) >= cutoff);
  }

  function _renderChart(registros) {
    const days = viewPeriod === 'semanal' ? 7 : 30;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const reg = registros.find(r => r.fecha === dateStr);
      data.push({
        label: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        value: reg ? reg.cantidad : 0,
      });
    }
    return Charts.barChart(data, {
      width: 700,
      height: 280,
      barColor: '#fbbf24',
      label: `Producción ${viewPeriod}`,
    });
  }

  function _renderHistory(registros) {
    let sorted = [...registros].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    sorted = Helpers.applySearch(sorted, searchTerm, ['fecha', 'tipo', 'notas']);
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const pageRows = sorted.slice(startIdx, startIdx + PAGE_SIZE);

    return Helpers.renderTable([
      { label: 'Fecha', render: r => Helpers.formatDate(r.fecha) },
      { label: 'Cantidad', render: r => `<strong class="production-count">${r.cantidad}</strong> 🥚` },
      { label: 'Tipo', render: r => r.tipo || 'Huevos' },
      { label: 'Notas', key: 'notas' },
    ], pageRows, {
      emptyIcon: '🥚',
      emptyText: searchTerm ? 'Sin resultados para la búsqueda' : 'No hay registros de producción',
      actions: row => `
        <button class="btn-icon-action" title="Editar" onclick="Produccion.openForm('${row.id}')">✏️</button>
        <button class="btn-icon-action" title="Eliminar" onclick="Produccion.confirmDelete('${row.id}')">🗑️</button>
      `,
    }) + Helpers.renderPagination(currentPage, totalPages, 'Produccion.goToPage');
  }

  // ---- Quick register ----

  function quickAdjust(delta) {
    const todayStr = Helpers.today();
    const registros = Store.getAll('produccion');
    const existing = registros.find(r => r.fecha === todayStr);

    if (existing) {
      const newQty = Math.max(0, existing.cantidad + delta);
      Store.update('produccion', existing.id, { cantidad: newQty });
    } else if (delta > 0) {
      Store.add('produccion', { fecha: todayStr, cantidad: delta, tipo: 'Huevos', notas: '' });
    }

    // Update counter display without full re-render
    const counter = document.getElementById('quickCount');
    if (counter) {
      const reg = Store.getAll('produccion').find(r => r.fecha === todayStr);
      counter.textContent = reg ? reg.cantidad : 0;
      counter.classList.add('counter-pulse');
      setTimeout(() => counter.classList.remove('counter-pulse'), 300);
    }
  }

  function quickSet(val) {
    const todayStr = Helpers.today();
    const existing = Store.getAll('produccion').find(r => r.fecha === todayStr);
    if (existing) {
      Store.update('produccion', existing.id, { cantidad: val });
    }
    App.refreshModule();
  }

  // ---- Form ----

  function openForm(id) {
    const existing = id ? Store.getById('produccion', id) : null;
    const isEdit = !!existing;

    const html = `
      <form class="form-grid" id="prodForm">
        <div class="form-group">
          <label class="form-label">Fecha *</label>
          <input class="form-input" type="date" id="f_fecha" value="${existing ? Helpers.toInputDate(existing.fecha) : Helpers.today()}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Cantidad *</label>
          <input class="form-input" type="number" id="f_cantidad" min="0" value="${existing?.cantidad ?? 0}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-input" id="f_tipo">
            <option value="Huevos" ${existing?.tipo === 'Huevos' || !existing ? 'selected' : ''}>🥚 Huevos</option>
            <option value="Leche" ${existing?.tipo === 'Leche' ? 'selected' : ''}>🥛 Leche</option>
            <option value="Lana" ${existing?.tipo === 'Lana' ? 'selected' : ''}>🧶 Lana</option>
            <option value="Otro" ${existing?.tipo === 'Otro' ? 'selected' : ''}>📦 Otro</option>
          </select>
        </div>
        <div class="form-group form-full">
          <label class="form-label">Notas</label>
          <textarea class="form-input form-textarea" id="f_notas" rows="2">${existing ? Helpers.escapeHtml(existing.notas) : ''}</textarea>
        </div>
      </form>
    `;

    Helpers.openModal(isEdit ? 'Editar Registro' : 'Registrar Producción', html, {
      onSubmit: (overlay) => {
        const fecha = overlay.querySelector('#f_fecha').value;
        const cantidad = parseInt(overlay.querySelector('#f_cantidad').value) || 0;
        if (!fecha) { Helpers.showToast('Indica la fecha', 'error'); return false; }

        const data = {
          fecha,
          cantidad,
          tipo: overlay.querySelector('#f_tipo').value,
          notas: overlay.querySelector('#f_notas').value.trim(),
        };

        if (isEdit) {
          Store.update('produccion', id, data);
          Helpers.showToast('Registro actualizado');
        } else {
          // Check if date already exists
          const dup = Store.filter('produccion', r => r.fecha === fecha);
          if (dup.length > 0) {
            Store.update('produccion', dup[0].id, { cantidad: dup[0].cantidad + cantidad });
            Helpers.showToast(`Sumado al registro existente (${dup[0].cantidad + cantidad} total)`);
          } else {
            Store.add('produccion', data);
            Helpers.showToast('Producción registrada');
          }
        }
        App.refreshModule();
      },
    });
  }

  function confirmDelete(id) {
    Helpers.confirmDialog('¿Eliminar este registro de producción?', () => {
      Store.remove('produccion', id);
      Helpers.showToast('Registro eliminado', 'warning');
      App.refreshModule();
    });
  }

  function setViewPeriod(period) {
    viewPeriod = period;
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

  return { render, quickAdjust, quickSet, openForm, confirmDelete, setViewPeriod, setSearch, goToPage };
})();
