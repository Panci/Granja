// ============================================================
// reproduccion.js — Módulo 4: Reproducción
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

window.Reproduccion = (() => {

  let searchTerm = '';
  let currentPage = 1;
  const PAGE_SIZE = 25;

  function render() {
    const registros = Store.getAll('reproduccion');
    const enGestacion = registros.filter(r => r.estado === 'En gestación');

    return `
      <div class="module-header">
        <div>
          <h1 class="module-title">🐣 Reproducción</h1>
          <p class="module-subtitle">${enGestacion.length} gestación${enGestacion.length !== 1 ? 'es' : ''} activa${enGestacion.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="module-actions">
          <button class="btn btn-primary" onclick="Reproduccion.openForm()">
            <span class="btn-icon">＋</span> Registrar Cruce
          </button>
        </div>
      </div>

      ${enGestacion.length > 0 ? _renderGestaciones(enGestacion) : ''}

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Historial de Reproducción</h2>
          <div class="filter-bar">
            ${Helpers.renderSearchBox('�� Buscar por ID, hembra, macho, notas...', 'reproduccionSearch')}
          </div>
        </div>
        <div class="card-body">
          ${_renderTable(registros)}
        </div>
      </div>
    `;
  }

  function _renderGestaciones(gestaciones) {
    let html = '<div class="gestacion-grid">';
    gestaciones.forEach(g => {
      const hembra = Store.getById('animals', g.hembra);
      const macho = Store.getById('animals', g.macho);
      const hembraName = hembra ? Helpers.escapeHtml(hembra.nombre) : Helpers.escapeHtml(g.hembra);
      const machoName = macho ? Helpers.escapeHtml(macho.nombre) : (g.macho ? Helpers.escapeHtml(g.macho) : '—');

      const now = new Date();
      const start = new Date(g.fechaMonta);
      const end = new Date(g.fechaEstimadaParto);
      const totalDays = Math.max((end - start) / (1000 * 60 * 60 * 24), 1);
      const elapsed = Math.max((now - start) / (1000 * 60 * 60 * 24), 0);
      const progress = Math.min(Math.round((elapsed / totalDays) * 100), 100);
      const daysLeft = Helpers.daysUntil(g.fechaEstimadaParto);

      html += `
        <div class="gestacion-card">
          <div class="gestacion-header">
            <span class="gestacion-pair">
              ${hembra ? Helpers.speciesIcon(hembra.especie) : '🐾'} 
              ♀ ${hembraName} × ♂ ${machoName}
            </span>
            ${Helpers.estadoBadge(g.estado)}
          </div>
          <div class="gestacion-dates">
            <span>📅 Monta: ${Helpers.formatDate(g.fechaMonta)}</span>
            <span>🍼 Parto est.: ${Helpers.formatDate(g.fechaEstimadaParto)}</span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar" style="width:${progress}%"></div>
          </div>
          <div class="gestacion-footer">
            <span class="gestacion-progress">${progress}% — ${daysLeft !== null && daysLeft > 0 ? `${daysLeft} día${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}` : daysLeft === 0 ? '¡Hoy es el día!' : 'Fecha pasada'}</span>
            <div>
              <button class="btn btn-sm btn-ghost" onclick="Reproduccion.registerBirth(${Helpers.jsArg(g.id)})">🍼 Registrar Parto</button>
              <button class="btn-icon-action" onclick="Reproduccion.openForm(${Helpers.jsArg(g.id)})">✏️</button>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  function _renderTable(registros) {
    let sorted = [...registros].sort((a, b) => new Date(b.fechaMonta) - new Date(a.fechaMonta));
    sorted = Helpers.applySearch(sorted, searchTerm, r => [
      r.id,
      _getAnimalName(r.hembra),
      _getAnimalName(r.macho),
      r.notasParto,
      r.estado,
    ]);
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const pageRows = sorted.slice(startIdx, startIdx + PAGE_SIZE);

    return Helpers.renderTable([
      { label: 'ID', key: 'id' },
      { label: 'Hembra', render: r => { const a = Store.getById('animals', r.hembra); return a ? `${Helpers.speciesIcon(a.especie)} ${Helpers.escapeHtml(a.nombre)}` : Helpers.escapeHtml(r.hembra); }},
      { label: 'Macho', render: r => { const a = Store.getById('animals', r.macho); return a ? `${Helpers.speciesIcon(a.especie)} ${Helpers.escapeHtml(a.nombre)}` : (r.macho ? Helpers.escapeHtml(r.macho) : '—'); }},
      { label: 'Fecha Monta', render: r => Helpers.formatDate(r.fechaMonta) },
      { label: 'Parto Est.', render: r => Helpers.formatDate(r.fechaEstimadaParto) },
      { label: 'Estado', render: r => Helpers.estadoBadge(r.estado) },
      { label: 'Crías', render: r => r.numeroCrias !== null && r.numeroCrias !== undefined ? r.numeroCrias : '—' },
      { label: 'Éxito', render: r => {
        if (r.exito === true) return Helpers.badge('Sí', 'success');
        if (r.exito === false) return Helpers.badge('No', 'danger');
        return '—';
      }},
    ], pageRows, {
      emptyIcon: '🐣',
      emptyText: searchTerm ? 'Sin resultados para la búsqueda' : 'No hay registros de reproducción',
      actions: row => `
        <button class="btn-icon-action" title="Editar" onclick="Reproduccion.openForm(${Helpers.jsArg(row.id)})">✏️</button>
        <button class="btn-icon-action" title="Eliminar" onclick="Reproduccion.confirmDelete(${Helpers.jsArg(row.id)})">🗑️</button>
      `,
    }) + Helpers.renderPagination(currentPage, totalPages, 'Reproduccion.goToPage');
  }

  function _getAnimalName(id) {
    const a = Store.getById('animals', id);
    return a ? a.nombre : id;
  }

  function openForm(id) {
    const existing = id ? Store.getById('reproduccion', id) : null;
    const isEdit = !!existing;

    const html = `
      <form class="form-grid" id="repForm">
        <div class="form-group">
          <label class="form-label">Hembra *</label>
          ${Helpers.animalSelect(existing?.hembra, 'f_hembra', { placeholder: 'Seleccionar hembra...' })}
        </div>
        <div class="form-group">
          <label class="form-label">Macho</label>
          ${Helpers.animalSelect(existing?.macho, 'f_macho', { placeholder: 'Seleccionar macho...' })}
        </div>
        <div class="form-group">
          <label class="form-label">Fecha de Monta *</label>
          <input class="form-input" type="date" id="f_fechaMonta" value="${existing ? Helpers.toInputDate(existing.fechaMonta) : Helpers.today()}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha Est. Parto</label>
          <input class="form-input" type="date" id="f_fechaEstimadaParto" value="${existing ? Helpers.toInputDate(existing.fechaEstimadaParto) : ''}">
          <small class="form-hint">Déjalo vacío para calcular automáticamente según la especie</small>
        </div>
        <div class="form-group">
          <label class="form-label">Estado</label>
          <select class="form-input" id="f_estado">
            <option value="En gestación" ${existing?.estado === 'En gestación' || !existing ? 'selected' : ''}>En gestación</option>
            <option value="Nacido" ${existing?.estado === 'Nacido' ? 'selected' : ''}>Nacido / Eclosionado</option>
            <option value="Perdido" ${existing?.estado === 'Perdido' ? 'selected' : ''}>Perdido / Aborto</option>
            <option value="Cancelado" ${existing?.estado === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Nº de Crías</label>
          <input class="form-input" type="number" id="f_numeroCrias" min="0" value="${existing?.numeroCrias ?? ''}">
        </div>
        <div class="form-group form-full">
          <label class="form-label">Notas del Parto</label>
          <textarea class="form-input form-textarea" id="f_notasParto" rows="2">${existing ? Helpers.escapeHtml(existing.notasParto) : ''}</textarea>
        </div>
      </form>
    `;

    Helpers.openModal(isEdit ? 'Editar Registro' : 'Registrar Cruce', html, {
      onSubmit: (overlay) => {
        const hembra = overlay.querySelector('#f_hembra').value;
        if (!hembra) { Helpers.showToast('Selecciona la hembra', 'error'); return false; }

        const fechaMonta = overlay.querySelector('#f_fechaMonta').value;
        let fechaEstimadaParto = overlay.querySelector('#f_fechaEstimadaParto').value;

        // Auto-calculate due date if empty
        if (!fechaEstimadaParto && fechaMonta) {
          const hembraAnimal = Store.getById('animals', hembra);
          if (hembraAnimal) {
            const sp = Store.filter('especies', s => s.nombre === hembraAnimal.especie)[0];
            if (sp) {
              fechaEstimadaParto = Helpers.addDays(fechaMonta, sp.gestacionDias);
            }
          }
        }

        const numeroCriasVal = overlay.querySelector('#f_numeroCrias').value;

        const data = {
          hembra,
          macho: overlay.querySelector('#f_macho').value || null,
          fechaMonta,
          fechaEstimadaParto,
          estado: overlay.querySelector('#f_estado').value,
          numeroCrias: numeroCriasVal !== '' ? parseInt(numeroCriasVal) : null,
          notasParto: overlay.querySelector('#f_notasParto').value.trim(),
          exito: null,
        };

        if (data.estado === 'Nacido') data.exito = true;
        else if (data.estado === 'Perdido') data.exito = false;

        if (isEdit) {
          Store.update('reproduccion', id, data);
          Helpers.showToast('Registro actualizado');
        } else {
          Store.add('reproduccion', data);
          Helpers.showToast('Cruce registrado');
        }
        App.refreshModule();
      },
    });
  }

  function registerBirth(id) {
    const reg = Store.getById('reproduccion', id);
    const html = `
      <form class="form-grid" id="birthForm">
        <div class="form-group">
          <label class="form-label">Nº de Crías</label>
          <input class="form-input" type="number" id="f_numeroCrias" min="0" value="" placeholder="¿Cuántas crías?">
        </div>
        <div class="form-group">
          <label class="form-label">¿Éxito?</label>
          <select class="form-input" id="f_exito">
            <option value="true">Sí ✅</option>
            <option value="false">No ❌</option>
          </select>
        </div>
        <div class="form-group form-full">
          <label class="form-label">Notas del Parto</label>
          <textarea class="form-input form-textarea" id="f_notasParto" rows="3" placeholder="Detalles del parto...">${reg ? Helpers.escapeHtml(reg.notasParto) : ''}</textarea>
        </div>
      </form>
    `;

    Helpers.openModal('🍼 Registrar Parto', html, {
      submitText: 'Registrar',
      onSubmit: (overlay) => {
        const numeroCriasVal = overlay.querySelector('#f_numeroCrias').value;
        Store.update('reproduccion', id, {
          estado: 'Nacido',
          numeroCrias: numeroCriasVal !== '' ? parseInt(numeroCriasVal) : null,
          exito: overlay.querySelector('#f_exito').value === 'true',
          notasParto: overlay.querySelector('#f_notasParto').value.trim(),
          fechaPartoReal: Helpers.today(),
        });
        Helpers.showToast('¡Parto registrado con éxito! 🍼');
        App.refreshModule();
      },
    });
  }

  function confirmDelete(id) {
    Helpers.confirmDialog('¿Eliminar este registro de reproducción?', () => {
      Store.remove('reproduccion', id);
      Helpers.showToast('Registro eliminado', 'warning');
      App.refreshModule();
    });
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

  return { render, openForm, registerBirth, confirmDelete, setSearch, goToPage };
})();
