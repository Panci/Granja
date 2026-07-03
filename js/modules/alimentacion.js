// ============================================================
// alimentacion.js — Módulo 3: Alimentación y Tareas Diarias
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

window.Alimentacion = (() => {

  let currentTab = 'dietas';

  function render() {
    const tabs = [
      { key: 'dietas', label: '🥣 Dietas' },
      { key: 'tareas', label: '📋 Tareas Pendientes' },
    ];

    return `
      <div class="module-header">
        <div>
          <h1 class="module-title">🥣 Alimentación y Tareas</h1>
          <p class="module-subtitle">Dietas, rutinas y tareas de mantenimiento</p>
        </div>
        <div class="module-actions">
          <button class="btn btn-primary" onclick="Alimentacion.openForm()">
            <span class="btn-icon">＋</span> ${currentTab === 'dietas' ? 'Nueva Dieta' : 'Nueva Tarea'}
          </button>
        </div>
      </div>

      <div class="tabs">
        ${tabs.map(t => `
          <button class="tab ${currentTab === t.key ? 'tab-active' : ''}" onclick="Alimentacion.setTab('${t.key}')">
            ${t.label}
          </button>
        `).join('')}
      </div>

      <div class="card">
        <div class="card-body">
          ${currentTab === 'dietas' ? _renderDietas() : _renderTareas()}
        </div>
      </div>
    `;
  }

  // ---- Dietas ----

  function _renderDietas() {
    const dietas = Store.getAll('dietas');

    return Helpers.renderTable([
      {
        label: 'Grupo / Animal', render: r => {
          if (r.grupo) return `${Helpers.speciesIcon(r.grupo)} ${r.grupo} (Grupo)`;
          const a = Store.getById('animals', r.animalId);
          return a ? `${Helpers.speciesIcon(a.especie)} ${a.nombre}` : r.animalId;
        }
      },
      { label: 'Tipo de Comida', key: 'tipoPienso' },
      { label: 'Cantidad', render: r => `${r.cantidad || '—'} ${r.unidad || ''}` },
      { label: 'Frecuencia', key: 'frecuencia' },
      { label: 'Notas', key: 'notas' },
    ], dietas, {
      emptyIcon: '🥣',
      emptyText: 'No hay dietas configuradas',
      actions: row => `
        <button class="btn-icon-action" title="Editar" onclick="Alimentacion.openDietForm('${row.id}')">✏️</button>
        <button class="btn-icon-action" title="Eliminar" onclick="Alimentacion.confirmDelete('dietas','${row.id}')">🗑️</button>
      `,
    });
  }

  // ---- Tareas ----

  function _renderTareas() {
    const tareas = Store.getAll('tareas');
    const pendientes = tareas.filter(t => t.estado !== 'Completada');
    const completadas = tareas.filter(t => t.estado === 'Completada');

    let html = '<div class="tasks-list">';

    if (pendientes.length === 0 && completadas.length === 0) {
      html += `<div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p class="empty-state-text">No hay tareas registradas</p>
      </div>`;
    }

    // Pending tasks
    pendientes.sort((a, b) => {
      if (!a.proximaEjecucion) return 1;
      if (!b.proximaEjecucion) return -1;
      return new Date(a.proximaEjecucion) - new Date(b.proximaEjecucion);
    });

    pendientes.forEach(t => {
      const days = t.proximaEjecucion ? Helpers.daysUntil(t.proximaEjecucion) : null;
      let urgency = '';
      if (days !== null && days < 0) urgency = 'task-overdue';
      else if (days !== null && days === 0) urgency = 'task-today';
      else if (days !== null && days <= 2) urgency = 'task-soon';

      html += `
        <div class="task-item ${urgency}">
          <button class="task-check" onclick="Alimentacion.toggleTask('${t.id}')" title="Marcar completada">
            <span class="task-check-inner"></span>
          </button>
          <div class="task-content">
            <div class="task-title">${t.titulo}</div>
            ${t.descripcion ? `<div class="task-desc">${t.descripcion}</div>` : ''}
            <div class="task-meta">
              ${t.grupo ? `<span class="task-tag">${Helpers.speciesIcon(t.grupo)} ${t.grupo}</span>` : ''}
              ${t.frecuencia ? `<span class="task-tag">🔄 ${t.frecuencia}</span>` : ''}
              ${t.proximaEjecucion ? `<span class="task-tag ${days < 0 ? 'task-tag-danger' : days === 0 ? 'task-tag-warning' : ''}">📅 ${Helpers.formatDate(t.proximaEjecucion)}${days !== null ? ` (${days === 0 ? 'Hoy' : days < 0 ? Math.abs(days) + 'd atrás' : days + 'd'})` : ''}</span>` : ''}
            </div>
          </div>
          <div class="task-actions">
            <button class="btn-icon-action" onclick="Alimentacion.openTaskForm('${t.id}')">✏️</button>
            <button class="btn-icon-action" onclick="Alimentacion.confirmDelete('tareas','${t.id}')">🗑️</button>
          </div>
        </div>
      `;
    });

    // Completed (last 10)
    if (completadas.length > 0) {
      html += `<div class="completed-section">
        <h3 class="completed-title">✅ Completadas (${completadas.length})</h3>`;
      completadas.slice(-10).reverse().forEach(t => {
        html += `
          <div class="task-item task-completed">
            <button class="task-check task-checked" onclick="Alimentacion.uncompleteTask('${t.id}')" title="Desmarcar">
              <span class="task-check-inner">✓</span>
            </button>
            <div class="task-content">
              <div class="task-title">${t.titulo}</div>
            </div>
            <button class="btn-icon-action" onclick="Alimentacion.confirmDelete('tareas','${t.id}')">🗑️</button>
          </div>
        `;
      });
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  // ---- Forms ----

  function openForm() {
    if (currentTab === 'dietas') openDietForm();
    else openTaskForm();
  }

  function openDietForm(id) {
    const existing = id ? Store.getById('dietas', id) : null;
    const isEdit = !!existing;
    const species = Helpers.getSpecies();

    const html = `
      <form class="form-grid" id="dietForm">
        <div class="form-group form-full">
          <label class="form-label">Asignar a *</label>
          <select class="form-input" id="f_target" onchange="document.getElementById('f_animalWrap').style.display=this.value==='animal'?'block':'none'">
            <option value="grupo" ${!existing?.animalId ? 'selected' : ''}>Grupo de animales</option>
            <option value="animal" ${existing?.animalId ? 'selected' : ''}>Animal individual</option>
          </select>
        </div>
        <div class="form-group" id="f_grupoWrap">
          <label class="form-label">Grupo (Especie)</label>
          ${Helpers.speciesSelect(existing?.grupo || '', 'f_grupo')}
        </div>
        <div class="form-group" id="f_animalWrap" style="display:${existing?.animalId ? 'block' : 'none'}">
          <label class="form-label">Animal</label>
          ${Helpers.animalSelect(existing?.animalId || '', 'f_animalId', { placeholder: 'Seleccionar...' })}
        </div>
        <div class="form-group">
          <label class="form-label">Tipo de Comida *</label>
          <input class="form-input" id="f_tipoPienso" value="${existing?.tipoPienso || ''}" placeholder="Ej: Pienso Royal Canin, Semillas...">
        </div>
        <div class="form-group">
          <label class="form-label">Cantidad</label>
          <input class="form-input" id="f_cantidad" value="${existing?.cantidad || ''}" placeholder="Ej: 200">
        </div>
        <div class="form-group">
          <label class="form-label">Unidad</label>
          <select class="form-input" id="f_unidad">
            <option value="g" ${existing?.unidad === 'g' ? 'selected' : ''}>gramos</option>
            <option value="kg" ${existing?.unidad === 'kg' ? 'selected' : ''}>kilogramos</option>
            <option value="ml" ${existing?.unidad === 'ml' ? 'selected' : ''}>mililitros</option>
            <option value="unidades" ${existing?.unidad === 'unidades' ? 'selected' : ''}>unidades</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Frecuencia</label>
          <select class="form-input" id="f_frecuencia">
            <option value="1x al día" ${existing?.frecuencia === '1x al día' ? 'selected' : ''}>1 vez al día</option>
            <option value="2x al día" ${existing?.frecuencia === '2x al día' || !existing ? 'selected' : ''}>2 veces al día</option>
            <option value="3x al día" ${existing?.frecuencia === '3x al día' ? 'selected' : ''}>3 veces al día</option>
            <option value="Ad libitum" ${existing?.frecuencia === 'Ad libitum' ? 'selected' : ''}>Ad libitum (libre)</option>
          </select>
        </div>
        <div class="form-group form-full">
          <label class="form-label">Notas</label>
          <textarea class="form-input form-textarea" id="f_notas" rows="2">${existing?.notas || ''}</textarea>
        </div>
      </form>
    `;

    Helpers.openModal(isEdit ? 'Editar Dieta' : 'Nueva Dieta', html, {
      onSubmit: (overlay) => {
        const target = overlay.querySelector('#f_target').value;
        const tipoPienso = overlay.querySelector('#f_tipoPienso').value.trim();
        if (!tipoPienso) { Helpers.showToast('Indica el tipo de comida', 'error'); return false; }

        const data = {
          grupo: target === 'grupo' ? overlay.querySelector('#f_grupo').value : null,
          animalId: target === 'animal' ? overlay.querySelector('#f_animalId').value : null,
          tipoPienso,
          cantidad: overlay.querySelector('#f_cantidad').value.trim(),
          unidad: overlay.querySelector('#f_unidad').value,
          frecuencia: overlay.querySelector('#f_frecuencia').value,
          notas: overlay.querySelector('#f_notas').value.trim(),
        };

        if (isEdit) {
          Store.update('dietas', id, data);
          Helpers.showToast('Dieta actualizada');
        } else {
          Store.add('dietas', data);
          Helpers.showToast('Dieta registrada');
        }
        App.refreshModule();
      },
    });
  }

  function openTaskForm(id) {
    const existing = id ? Store.getById('tareas', id) : null;
    const isEdit = !!existing;

    const html = `
      <form class="form-grid" id="taskForm">
        <div class="form-group form-full">
          <label class="form-label">Título *</label>
          <input class="form-input" id="f_titulo" value="${existing?.titulo || ''}" placeholder="Ej: Limpiar gallinero">
        </div>
        <div class="form-group form-full">
          <label class="form-label">Descripción</label>
          <textarea class="form-input form-textarea" id="f_descripcion" rows="2">${existing?.descripcion || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Grupo (Especie)</label>
          ${Helpers.speciesSelect(existing?.grupo || '', 'f_grupo', true)}
        </div>
        <div class="form-group">
          <label class="form-label">Frecuencia</label>
          <select class="form-input" id="f_frecuencia">
            <option value="" ${!existing?.frecuencia ? 'selected' : ''}>Una vez</option>
            <option value="Diaria" ${existing?.frecuencia === 'Diaria' ? 'selected' : ''}>Diaria</option>
            <option value="Semanal" ${existing?.frecuencia === 'Semanal' ? 'selected' : ''}>Semanal</option>
            <option value="Mensual" ${existing?.frecuencia === 'Mensual' ? 'selected' : ''}>Mensual</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Próxima Ejecución</label>
          <input class="form-input" type="date" id="f_proximaEjecucion" value="${existing ? Helpers.toInputDate(existing.proximaEjecucion) : Helpers.today()}">
        </div>
      </form>
    `;

    Helpers.openModal(isEdit ? 'Editar Tarea' : 'Nueva Tarea', html, {
      onSubmit: (overlay) => {
        const titulo = overlay.querySelector('#f_titulo').value.trim();
        if (!titulo) { Helpers.showToast('Indica un título', 'error'); return false; }

        const data = {
          titulo,
          descripcion: overlay.querySelector('#f_descripcion').value.trim(),
          grupo: overlay.querySelector('#f_grupo').value || null,
          frecuencia: overlay.querySelector('#f_frecuencia').value || null,
          proximaEjecucion: overlay.querySelector('#f_proximaEjecucion').value || null,
          estado: existing?.estado || 'Pendiente',
        };

        if (isEdit) {
          Store.update('tareas', id, data);
          Helpers.showToast('Tarea actualizada');
        } else {
          Store.add('tareas', data);
          Helpers.showToast('Tarea creada');
        }
        App.refreshModule();
      },
    });
  }

  function toggleTask(id) {
    const task = Store.getById('tareas', id);
    if (!task) return;

    Store.update('tareas', id, { estado: 'Completada', completadaEn: Helpers.today() });

    // If recurring, create next occurrence
    if (task.frecuencia && task.proximaEjecucion) {
      let nextDate;
      if (task.frecuencia === 'Diaria') nextDate = Helpers.addDays(Helpers.today(), 1);
      else if (task.frecuencia === 'Semanal') nextDate = Helpers.addDays(Helpers.today(), 7);
      else if (task.frecuencia === 'Mensual') nextDate = Helpers.addDays(Helpers.today(), 30);

      if (nextDate) {
        Store.add('tareas', {
          titulo: task.titulo,
          descripcion: task.descripcion,
          grupo: task.grupo,
          frecuencia: task.frecuencia,
          proximaEjecucion: nextDate,
          estado: 'Pendiente',
        });
      }
    }

    Helpers.showToast('Tarea completada ✓');
    App.refreshModule();
  }

  function uncompleteTask(id) {
    Store.update('tareas', id, { estado: 'Pendiente', completadaEn: null });
    App.refreshModule();
  }

  function confirmDelete(collection, id) {
    Helpers.confirmDialog('¿Eliminar este registro?', () => {
      Store.remove(collection, id);
      Helpers.showToast('Registro eliminado', 'warning');
      App.refreshModule();
    });
  }

  function setTab(tab) {
    currentTab = tab;
    App.refreshModule();
  }

  return { render, openForm, openDietForm, openTaskForm, toggleTask, uncompleteTask, confirmDelete, setTab };
})();
