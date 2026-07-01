// ============================================================
// salud.js — Módulo 2: Salud y Cuidados
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

window.Salud = (() => {

  let currentTab = 'vacunas';
  let filterAnimal = '';

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
            ${Helpers.animalSelect(filterAnimal, 'filterAnimalSalud', { placeholder: 'Todos los animales' })}
            <script>document.getElementById('filterAnimalSalud').onchange=function(){Salud.setFilterAnimal(this.value)}</script>
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
    const now = new Date();
    const alerts = [];

    // Overdue or upcoming vaccines
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

    // Overdue deworming
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

    // Active treatments
    Store.getAll('tratamientos').forEach(t => {
      if (t.estado !== 'Activo') return;
      const animal = Store.getById('animals', t.animalId);
      const name = animal ? animal.nombre : t.animalId;
      alerts.push({ type: 'info', icon: '💊', text: `${name}: Tratamiento activo — ${t.medicamento}` });
    });

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

    return Helpers.renderTable([
      { label: 'Animal', render: r => { const a = Store.getById('animals', r.animalId); return a ? `${Helpers.speciesIcon(a.especie)} ${a.nombre}` : r.animalId; }},
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
    ], items, {
      emptyIcon: '💉',
      emptyText: 'No hay vacunas registradas',
      actions: row => `
        <button class="btn-icon-action" title="Editar" onclick="Salud.openForm('vacunas','${row.id}')">✏️</button>
        <button class="btn-icon-action" title="Eliminar" onclick="Salud.confirmDelete('vacunas','${row.id}')">🗑️</button>
      `,
    });
  }

  // ---- Desparasitaciones ----

  function _renderDesparasitaciones() {
    let items = Store.getAll('desparasitaciones');
    if (filterAnimal) items = items.filter(d => d.animalId === filterAnimal);
    items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return Helpers.renderTable([
      { label: 'Animal', render: r => { const a = Store.getById('animals', r.animalId); return a ? `${Helpers.speciesIcon(a.especie)} ${a.nombre}` : r.animalId; }},
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
    ], items, {
      emptyIcon: '🧴',
      emptyText: 'No hay desparasitaciones registradas',
      actions: row => `
        <button class="btn-icon-action" title="Editar" onclick="Salud.openForm('desparasitaciones','${row.id}')">✏️</button>
        <button class="btn-icon-action" title="Eliminar" onclick="Salud.confirmDelete('desparasitaciones','${row.id}')">🗑️</button>
      `,
    });
  }

  // ---- Tratamientos ----

  function _renderTratamientos() {
    let items = Store.getAll('tratamientos');
    if (filterAnimal) items = items.filter(t => t.animalId === filterAnimal);
    items.sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));

    return Helpers.renderTable([
      { label: 'Animal', render: r => { const a = Store.getById('animals', r.animalId); return a ? `${Helpers.speciesIcon(a.especie)} ${a.nombre}` : r.animalId; }},
      { label: 'Inicio', render: r => Helpers.formatDate(r.fechaInicio) },
      { label: 'Fin', render: r => Helpers.formatDate(r.fechaFin) },
      { label: 'Tipo', key: 'tipo' },
      { label: 'Medicamento', key: 'medicamento' },
      { label: 'Dosis', key: 'dosis' },
      { label: 'Estado', render: r => Helpers.estadoBadge(r.estado) },
    ], items, {
      emptyIcon: '💊',
      emptyText: 'No hay tratamientos registrados',
      actions: row => `
        <button class="btn-icon-action" title="Editar" onclick="Salud.openForm('tratamientos','${row.id}')">✏️</button>
        ${row.estado === 'Activo' ? `<button class="btn-icon-action" title="Completar" onclick="Salud.completeTreatment('${row.id}')">✅</button>` : ''}
        <button class="btn-icon-action" title="Eliminar" onclick="Salud.confirmDelete('tratamientos','${row.id}')">🗑️</button>
      `,
    });
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
            <input class="form-input" id="f_tipo" value="${existing?.tipo || ''}" placeholder="Ej: Rabia, Parvovirus..." required>
          </div>
          <div class="form-group">
            <label class="form-label">Lote</label>
            <input class="form-input" id="f_lote" value="${existing?.lote || ''}" placeholder="Nº de lote">
          </div>
          <div class="form-group">
            <label class="form-label">Próxima Dosis</label>
            <input class="form-input" type="date" id="f_proximaDosis" value="${existing ? Helpers.toInputDate(existing.proximaDosis) : ''}">
          </div>
          <div class="form-group form-full">
            <label class="form-label">Notas</label>
            <textarea class="form-input form-textarea" id="f_notas" rows="2">${existing?.notas || ''}</textarea>
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
            <input class="form-input" id="f_producto" value="${existing?.producto || ''}" placeholder="Ej: Frontline, Milbemax..." required>
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
            <input class="form-input" id="f_tipo" value="${existing?.tipo || ''}" placeholder="Ej: Antibiótico, Antiinflamatorio...">
          </div>
          <div class="form-group">
            <label class="form-label">Medicamento *</label>
            <input class="form-input" id="f_medicamento" value="${existing?.medicamento || ''}" placeholder="Nombre del medicamento">
          </div>
          <div class="form-group">
            <label class="form-label">Dosis</label>
            <input class="form-input" id="f_dosis" value="${existing?.dosis || ''}" placeholder="Ej: 1 comprimido/12h">
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
    App.refreshModule();
  }

  function setFilterAnimal(val) {
    filterAnimal = val;
    App.refreshModule();
  }

  return { render, openForm, confirmDelete, setTab, setFilterAnimal, completeTreatment };
})();
