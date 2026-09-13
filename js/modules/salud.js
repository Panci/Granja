// ============================================================
// salud.js — Módulo 2: Salud y Cuidados
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

window.Salud = (() => {

  let currentTab = 'vacunas';
  let filterAnimal = '';
  let searchTerm = '';
  let currentPage = 1;
  const PAGE_SIZE = 25;

  function render() {
    const tabs = [
      { key: 'vacunas', label: '💉 Vacunas', icon: '💉' },
      { key: 'desparasitaciones', label: '🧴 Desparasitaciones', icon: '🧴' },
      { key: 'tratamientos', label: '💊 Tratamientos', icon: '💊' },
    ];

    // Alerts
    const alertsHtml = _renderAlerts();

    return `
      <div class="module-header">
        <div>
          <h1 class="module-title">🏥 Salud y Cuidados</h1>
          <p class="module-subtitle">Control de vacunas, desparasitaciones y tratamientos</p>
        </div>
        <div class="module-actions">
          <button class="btn btn-primary" onclick="Salud.openForm()">
            <span class="btn-icon">＋</span> Nuevo Registro
          </button>
        </div>
      </div>

      ${alertsHtml}

      <div class="tabs">
        ${tabs.map(t => `
          <button class="tab ${currentTab === t.key ? 'tab-active' : ''}" onclick="Salud.setTab('${t.key}')">
            ${t.label}
          </button>
        `).join('')}
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">${tabs.find(t => t.key === currentTab).label}</h2>
          <div class="filter-bar">
            ${Helpers.renderSearchBox('�� Buscar por tipo, producto, medicamento...', 'saludSearch')}
            ${Helpers.animalSelect(filterAnimal, 'filterAnimalSalud', { placeholder: 'Todos los animales' })}
          </div>
        </div>
        <div class="card-body">
          ${currentTab === 'vacunas' ? _renderVacunas() : ''}
          ${currentTab === 'desparasitaciones' ? _renderDesparasitaciones() : ''}
          ${currentTab === 'tratamientos' ? _renderTratamientos() : ''}
        </div>
      </div>
    `;
  }

  // ---- Alerts Panel ----

  function _renderAlerts() {
    const alerts = Helpers.getHealthAlerts();
    if (alerts.length === 0) return '';

    return `<div class="alerts-panel">
      <h3 class="alerts-title">⚠️ Alertas de Salud (${alerts.length})</h3>
      ${alerts.map(a => `
        <div class="alert alert-${a.type}">
          <span class="alert-icon">${a.icon}</span>
          <span class="alert-text">${a.text}</span>
        </div>
      `).join('')}
    </div>`;
  }

  // ---- Vacunas ----

  function _renderVacunas() {
    let items = Store.getAll('vacunas');
    if (filterAnimal) items = items.filter(v => v.animalId === filterAnimal);
    items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    items = Helpers.applySearch(items, searchTerm, r => [
      r.tipo,
      r.lote,
      r.notas,
      _getAnimalName(r.animalId),
    ]);
    const { rows, totalPages } = _paginate(items);

    return Helpers.renderTable([
      { label: 'Animal', render: r => { const a = Store.getById('animals', r.animalId); return a ? `${Helpers.speciesIcon(a.especie)} ${Helpers.escapeHtml(a.nombre)}` : Helpers.escapeHtml(r.animalId); }},
      { label: 'Fecha', render: r => Helpers.formatDate(r.fecha) },
      { label: 'Vacuna', key: 'tipo' },
      { label: 'Lote', key: 'lote' },
      { label: 'Próxima Dosis', render: r => {
        if (!r.proximaDosis) return '—';
        const days = Helpers.daysUntil(r.proximaDosis);
        const dateStr = Helpers.formatDate(r.proximaDosis);
        if (days < 0) return Helpers.badge(`${dateStr} (¡Vencida!)`, 'danger');
        if (days <= 7) return Helpers.badge(`${dateStr} (${days}d)`, 'warning');
        return dateStr;
      }},
      { label: 'Notas', key: 'notas' },
    ], rows, {
      emptyIcon: '💉',
      emptyText: searchTerm ? 'Sin resultados para la búsqueda' : 'No hay vacunas registradas',
      actions: row => `
        <button class="btn-icon-action" title="Editar" onclick="Salud.openForm('vacunas',${Helpers.jsArg(row.id)})">✏️</button>
        <button class="btn-icon-action" title="Eliminar" onclick="Salud.confirmDelete('vacunas',${Helpers.jsArg(row.id)})">🗑️</button>
      `,
    }) + Helpers.renderPagination(currentPage, totalPages, 'Salud.goToPage');
  }

  // ---- Desparasitaciones ----

  function _renderDesparasitaciones() {
    let items = Store.getAll('desparasitaciones');
    if (filterAnimal) items = items.filter(d => d.animalId === filterAnimal);
    items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    items = Helpers.applySearch(items, searchTerm, r => [
      r.producto,
      r.tipoIntExt,
      r.notas,
      _getAnimalName(r.animalId),
    ]);
    const { rows, totalPages } = _paginate(items);

    return Helpers.renderTable([
      { label: 'Animal', render: r => { const a = Store.getById('animals', r.animalId); return a ? `${Helpers.speciesIcon(a.especie)} ${Helpers.escapeHtml(a.nombre)}` : Helpers.escapeHtml(r.animalId); }},
      { label: 'Fecha', render: r => Helpers.formatDate(r.fecha) },
      { label: 'Tipo', render: r => Helpers.badge(r.tipoIntExt, r.tipoIntExt === 'Interna' ? 'info' : 'warning') },
      { label: 'Producto', key: 'producto' },
      { label: 'Próxima Aplicación', render: r => {
        if (!r.proximaAplicacion) return '—';
        const days = Helpers.daysUntil(r.proximaAplicacion);
        const dateStr = Helpers.formatDate(r.proximaAplicacion);
        if (days < 0) return Helpers.badge(`${dateStr} (¡Vencida!)`, 'danger');
        if (days <= 7) return Helpers.badge(`${dateStr} (${days}d)`, 'warning');
        return dateStr;
      }},
    ], rows, {
      emptyIcon: '🧴',
      emptyText: searchTerm ? 'Sin resultados para la búsqueda' : 'No hay desparasitaciones registradas',
      actions: row => `
        <button class="btn-icon-action" title="Editar" onclick="Salud.openForm('desparasitaciones',${Helpers.jsArg(row.id)})">✏️</button>
        <button class="btn-icon-action" title="Eliminar" onclick="Salud.confirmDelete('desparasitaciones',${Helpers.jsArg(row.id)})">🗑️</button>
      `,
    }) + Helpers.renderPagination(currentPage, totalPages, 'Salud.goToPage');
  }

  // ---- Tratamientos ----

  function _renderTratamientos() {
    let items = Store.getAll('tratamientos');
    if (filterAnimal) items = items.filter(t => t.animalId === filterAnimal);
    items.sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
    items = Helpers.applySearch(items, searchTerm, r => [
      r.tipo,
      r.medicamento,
      r.dosis,
      r.estado,
      _getAnimalName(r.animalId),
    ]);
    const { rows, totalPages } = _paginate(items);

    return Helpers.renderTable([
      { label: 'Animal', render: r => { const a = Store.getById('animals', r.animalId); return a ? `${Helpers.speciesIcon(a.especie)} ${Helpers.escapeHtml(a.nombre)}` : Helpers.escapeHtml(r.animalId); }},
      { label: 'Inicio', render: r => Helpers.formatDate(r.fechaInicio) },
      { label: 'Fin', render: r => Helpers.formatDate(r.fechaFin) },
      { label: 'Tipo', key: 'tipo' },
      { label: 'Medicamento', key: 'medicamento' },
      { label: 'Dosis', key: 'dosis' },
      { label: 'Estado', render: r => Helpers.estadoBadge(r.estado) },
    ], rows, {
      emptyIcon: '💊',
      emptyText: searchTerm ? 'Sin resultados para la búsqueda' : 'No hay tratamientos registrados',
      actions: row => `
        <button class="btn-icon-action" title="Editar" onclick="Salud.openForm('tratamientos',${Helpers.jsArg(row.id)})">✏️</button>
        ${row.estado === 'Activo' ? `<button class="btn-icon-action" title="Completar" onclick="Salud.completeTreatment(${Helpers.jsArg(row.id)})">✅</button>` : ''}
        <button class="btn-icon-action" title="Eliminar" onclick="Salud.confirmDelete('tratamientos',${Helpers.jsArg(row.id)})">🗑️</button>
      `,
    }) + Helpers.renderPagination(currentPage, totalPages, 'Salud.goToPage');
  }

  // ---- Helpers internos ----

  function _getAnimalName(id) {
    const a = Store.getById('animals', id);
    return a ? a.nombre : id;
  }

  function _paginate(items) {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    return { rows: items.slice(startIdx, startIdx + PAGE_SIZE), totalPages };
  }

  // ---- Form ----

  function openForm(type, id) {
    type = type || currentTab;
    const existing = id ? Store.getById(type, id) : null;
    const isEdit = !!existing;

    let formHtml = '';
    let title = '';

    if (type === 'vacunas') {
      title = isEdit ? 'Editar Vacuna' : 'Registrar Vacuna';
      formHtml = `
        <form class="form-grid" id="saludForm">
          <div class="form-group form-full">
            <label class="form-label">Animal *</label>
            ${Helpers.animalSelect(existing?.animalId, 'f_animalId', { placeholder: 'Seleccionar animal...' })}
          </div>
          <div class="form-group">
            <label class="form-label">Fecha *</label>
            <input class="form-input" type="date" id="f_fecha" value="${existing ? Helpers.toInputDate(existing.fecha) : Helpers.today()}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo de Vacuna *</label>
            <input class="form-input" id="f_tipo" value="${existing ? Helpers.escapeHtml(existing.tipo) : ''}" placeholder="Ej: Rabia, Parvovirus..." required>
          </div>
          <div class="form-group">
            <label class="form-label">Lote</label>
            <input class="form-input" id="f_lote" value="${existing ? Helpers.escapeHtml(existing.lote) : ''}" placeholder="Nº de lote">
          </div>
          <div class="form-group">
            <label class="form-label">Próxima Dosis</label>
            <input class="form-input" type="date" id="f_proximaDosis" value="${existing ? Helpers.toInputDate(existing.proximaDosis) : ''}">
          </div>
          <div class="form-group form-full">
            <label class="form-label">Notas</label>
            <textarea class="form-input form-textarea" id="f_notas" rows="2">${existing ? Helpers.escapeHtml(existing.notas) : ''}</textarea>
          </div>
        </form>
      `;
    } else if (type === 'desparasitaciones') {
      title = isEdit ? 'Editar Desparasitación' : 'Registrar Desparasitación';
      formHtml = `
        <form class="form-grid" id="saludForm">
          <div class="form-group form-full">
            <label class="form-label">Animal *</label>
            ${Helpers.animalSelect(existing?.animalId, 'f_animalId', { placeholder: 'Seleccionar animal...' })}
          </div>
          <div class="form-group">
            <label class="form-label">Fecha *</label>
            <input class="form-input" type="date" id="f_fecha" value="${existing ? Helpers.toInputDate(existing.fecha) : Helpers.today()}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo *</label>
            <select class="form-input" id="f_tipoIntExt">
              <option value="Interna" ${existing?.tipoIntExt === 'Interna' ? 'selected' : ''}>Interna</option>
              <option value="Externa" ${existing?.tipoIntExt === 'Externa' ? 'selected' : ''}>Externa</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Producto *</label>
            <input class="form-input" id="f_producto" value="${existing ? Helpers.escapeHtml(existing.producto) : ''}" placeholder="Ej: Frontline, Milbemax..." required>
          </div>
          <div class="form-group">
            <label class="form-label">Próxima Aplicación</label>
            <input class="form-input" type="date" id="f_proximaAplicacion" value="${existing ? Helpers.toInputDate(existing.proximaAplicacion) : ''}">
          </div>
          <div class="form-group form-full">
            <label class="form-label">Notas</label>
            <textarea class="form-input form-textarea" id="f_notas" rows="2">${existing?.notas || ''}</textarea>
          </div>
        </form>
      `;
    } else if (type === 'tratamientos') {
      title = isEdit ? 'Editar Tratamiento' : 'Registrar Tratamiento';
      formHtml = `
        <form class="form-grid" id="saludForm">
          <div class="form-group form-full">
            <label class="form-label">Animal *</label>
            ${Helpers.animalSelect(existing?.animalId, 'f_animalId', { placeholder: 'Seleccionar animal...' })}
          </div>
          <div class="form-group">
            <label class="form-label">Fecha Inicio *</label>
            <input class="form-input" type="date" id="f_fechaInicio" value="${existing ? Helpers.toInputDate(existing.fechaInicio) : Helpers.today()}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Fecha Fin</label>
            <input class="form-input" type="date" id="f_fechaFin" value="${existing ? Helpers.toInputDate(existing.fechaFin) : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Tipo *</label>
            <input class="form-input" id="f_tipo" value="${existing ? Helpers.escapeHtml(existing.tipo) : ''}" placeholder="Ej: Antibiótico, Antiinflamatorio...">
          </div>
          <div class="form-group">
            <label class="form-label">Medicamento *</label>
            <input class="form-input" id="f_medicamento" value="${existing ? Helpers.escapeHtml(existing.medicamento) : ''}" placeholder="Nombre del medicamento">
          </div>
          <div class="form-group">
            <label class="form-label">Dosis</label>
            <input class="form-input" id="f_dosis" value="${existing ? Helpers.escapeHtml(existing.dosis) : ''}" placeholder="Ej: 1 comprimido/12h">
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-input" id="f_estado">
              <option value="Activo" ${existing?.estado === 'Activo' || !existing ? 'selected' : ''}>Activo</option>
              <option value="Completado" ${existing?.estado === 'Completado' ? 'selected' : ''}>Completado</option>
              <option value="Cancelado" ${existing?.estado === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>
          </div>
        </form>
      `;
    }

    Helpers.openModal(title, formHtml, {
      submitText: isEdit ? 'Actualizar' : 'Guardar',
      onSubmit: (overlay) => {
        const animalId = overlay.querySelector('#f_animalId').value;
        if (!animalId) { Helpers.showToast('Selecciona un animal', 'error'); return false; }

        let data = { animalId };

        if (type === 'vacunas') {
          data.fecha = overlay.querySelector('#f_fecha').value;
          data.tipo = overlay.querySelector('#f_tipo').value.trim();
          data.lote = overlay.querySelector('#f_lote').value.trim();
          data.proximaDosis = overlay.querySelector('#f_proximaDosis').value || null;
          data.notas = overlay.querySelector('#f_notas').value.trim();
          if (!data.tipo) { Helpers.showToast('Indica el tipo de vacuna', 'error'); return false; }
        } else if (type === 'desparasitaciones') {
          data.fecha = overlay.querySelector('#f_fecha').value;
          data.tipoIntExt = overlay.querySelector('#f_tipoIntExt').value;
          data.producto = overlay.querySelector('#f_producto').value.trim();
          data.proximaAplicacion = overlay.querySelector('#f_proximaAplicacion').value || null;
          data.notas = overlay.querySelector('#f_notas').value.trim();
          if (!data.producto) { Helpers.showToast('Indica el producto', 'error'); return false; }
        } else if (type === 'tratamientos') {
          data.fechaInicio = overlay.querySelector('#f_fechaInicio').value;
          data.fechaFin = overlay.querySelector('#f_fechaFin').value || null;
          data.tipo = overlay.querySelector('#f_tipo').value.trim();
          data.medicamento = overlay.querySelector('#f_medicamento').value.trim();
          data.dosis = overlay.querySelector('#f_dosis').value.trim();
          data.estado = overlay.querySelector('#f_estado').value;
          if (!data.medicamento) { Helpers.showToast('Indica el medicamento', 'error'); return false; }
        }

        if (isEdit) {
          Store.update(type, id, data);
          Helpers.showToast('Registro actualizado');
        } else {
          Store.add(type, data);
          Helpers.showToast('Registro guardado');
        }
        App.refreshModule();
      },
    });
  }

  function completeTreatment(id) {
    Store.update('tratamientos', id, { estado: 'Completado', fechaFin: Helpers.today() });
    Helpers.showToast('Tratamiento marcado como completado');
    App.refreshModule();
  }

  function confirmDelete(type, id) {
    Helpers.confirmDialog('¿Eliminar este registro de salud?', () => {
      Store.remove(type, id);
      Helpers.showToast('Registro eliminado', 'warning');
      App.refreshModule();
    });
  }

  function setTab(tab) {
    currentTab = tab;
    currentPage = 1;
    App.refreshModule();
  }

  function setFilterAnimal(val) {
    filterAnimal = val;
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

  return { render, openForm, confirmDelete, setTab, setFilterAnimal, setSearch, goToPage, completeTreatment };
})();
