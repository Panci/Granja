// ============================================================
// inventario.js — Módulo 1: Gestión de Inventario
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

const Inventario = (() => {

  let currentFilter = { especie: '', estado: '' };

  function render() {
    const animals = getFilteredAnimals();
    const allAnimals = Store.getAll('animals');
    const species = Helpers.getSpecies();

    // Stats cards
    const statsHtml = species.map(sp => {
      const count = allAnimals.filter(a => a.especie === sp.nombre && a.estado === 'Activo').length;
      return Charts.statCard(count, sp.nombre, sp.icono, Charts.COLORS[species.indexOf(sp)]);
    }).join('');

    const totalActive = allAnimals.filter(a => a.estado === 'Activo').length;

    return `
      <div class="module-header">
        <div>
          <h1 class="module-title">🐾 Gestión de Inventario</h1>
          <p class="module-subtitle">${totalActive} animal${totalActive !== 1 ? 'es' : ''} activo${totalActive !== 1 ? 's' : ''} registrado${totalActive !== 1 ? 's' : ''}</p>
        </div>
        <div class="module-actions">
          <button class="btn btn-primary" onclick="Inventario.openForm()">
            <span class="btn-icon">＋</span> Registrar Animal
          </button>
          <button class="btn btn-ghost" onclick="Inventario.openSpeciesForm()">
            <span class="btn-icon">🏷️</span> Especies
          </button>
        </div>
      </div>

      <div class="stats-grid">${statsHtml}</div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Listado de Animales</h2>
          <div class="filter-bar">
            <select class="form-input form-input-sm" id="filterEspecie" onchange="Inventario.setFilter('especie', this.value)">
              <option value="">Todas las especies</option>
              ${species.map(sp => `<option value="${sp.nombre}" ${currentFilter.especie === sp.nombre ? 'selected' : ''}>${sp.icono} ${sp.nombre}</option>`).join('')}
            </select>
            <select class="form-input form-input-sm" id="filterEstado" onchange="Inventario.setFilter('estado', this.value)">
              <option value="">Todos los estados</option>
              <option value="Activo" ${currentFilter.estado === 'Activo' ? 'selected' : ''}>Activo</option>
              <option value="Vendido" ${currentFilter.estado === 'Vendido' ? 'selected' : ''}>Vendido</option>
              <option value="Fallecido" ${currentFilter.estado === 'Fallecido' ? 'selected' : ''}>Fallecido</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          ${Helpers.renderTable(
            [
              { label: 'ID', key: 'id' },
              { label: 'Nombre', render: r => `<strong>${r.nombre}</strong>` },
              { label: 'Especie', render: r => `${Helpers.speciesIcon(r.especie)} ${r.especie}` },
              { label: 'Raza', key: 'raza' },
              { label: 'Sexo', render: r => r.sexo === 'Macho' ? '♂️ Macho' : '♀️ Hembra' },
              { label: 'Edad', render: r => Helpers.calcAge(r.fechaNacimiento) },
              { label: 'Estado', render: r => Helpers.estadoBadge(r.estado) },
            ],
            animals,
            {
              emptyIcon: '🐾',
              emptyText: 'No hay animales registrados. ¡Añade el primero!',
              actions: row => `
                <button class="btn-icon-action" title="Editar" onclick="Inventario.openForm('${row.id}')">✏️</button>
                <button class="btn-icon-action" title="Eliminar" onclick="Inventario.confirmDelete('${row.id}')">🗑️</button>
              `,
            }
          )}
        </div>
      </div>
    `;
  }

  function getFilteredAnimals() {
    return Store.filter('animals', a => {
      if (currentFilter.especie && a.especie !== currentFilter.especie) return false;
      if (currentFilter.estado && a.estado !== currentFilter.estado) return false;
      return true;
    });
  }

  function setFilter(key, value) {
    currentFilter[key] = value;
    App.refreshModule();
  }

  function openForm(id) {
    const animal = id ? Store.getById('animals', id) : null;
    const isEdit = !!animal;
    const species = Helpers.getSpecies();

    const html = `
      <form id="animalForm" class="form-grid">
        <div class="form-group">
          <label class="form-label">Nombre *</label>
          <input class="form-input" id="f_nombre" value="${animal ? animal.nombre : ''}" required placeholder="Ej: Luna">
        </div>
        <div class="form-group">
          <label class="form-label">Especie *</label>
          ${Helpers.speciesSelect(animal ? animal.especie : species[0]?.nombre)}
        </div>
        <div class="form-group">
          <label class="form-label">Raza</label>
          <input class="form-input" id="f_raza" value="${animal ? (animal.raza || '') : ''}" placeholder="Ej: Pastor Alemán">
        </div>
        <div class="form-group">
          <label class="form-label">Sexo *</label>
          <select class="form-input" id="f_sexo">
            <option value="Hembra" ${animal?.sexo === 'Hembra' ? 'selected' : ''}>♀️ Hembra</option>
            <option value="Macho" ${animal?.sexo === 'Macho' ? 'selected' : ''}>♂️ Macho</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha de Nacimiento</label>
          <input class="form-input" type="date" id="f_fechaNacimiento" value="${animal ? Helpers.toInputDate(animal.fechaNacimiento) : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Estado</label>
          <select class="form-input" id="f_estado">
            <option value="Activo" ${animal?.estado === 'Activo' || !animal ? 'selected' : ''}>✅ Activo</option>
            <option value="Vendido" ${animal?.estado === 'Vendido' ? 'selected' : ''}>💰 Vendido</option>
            <option value="Fallecido" ${animal?.estado === 'Fallecido' ? 'selected' : ''}>⚫ Fallecido</option>
          </select>
        </div>
        <div class="form-group form-full">
          <label class="form-label">Notas</label>
          <textarea class="form-input form-textarea" id="f_notas" rows="2" placeholder="Observaciones...">${animal ? (animal.notas || '') : ''}</textarea>
        </div>
      </form>
    `;

    Helpers.openModal(isEdit ? 'Editar Animal' : 'Registrar Animal', html, {
      submitText: isEdit ? 'Actualizar' : 'Registrar',
      onSubmit: (overlay) => {
        const nombre = overlay.querySelector('#f_nombre').value.trim();
        if (!nombre) { Helpers.showToast('El nombre es obligatorio', 'error'); return false; }

        const data = {
          nombre,
          especie: overlay.querySelector('#especie').value,
          raza: overlay.querySelector('#f_raza').value.trim(),
          sexo: overlay.querySelector('#f_sexo').value,
          fechaNacimiento: overlay.querySelector('#f_fechaNacimiento').value || null,
          estado: overlay.querySelector('#f_estado').value,
          notas: overlay.querySelector('#f_notas').value.trim(),
        };

        if (isEdit) {
          Store.update('animals', id, data);
          Helpers.showToast(`${data.nombre} actualizado correctamente`);
        } else {
          data.fechaAlta = Helpers.today();
          Store.add('animals', data);
          Helpers.showToast(`${data.nombre} registrado correctamente`);
        }
        App.refreshModule();
      },
    });
  }

  function confirmDelete(id) {
    const animal = Store.getById('animals', id);
    Helpers.confirmDialog(
      `¿Eliminar a <strong>${animal.nombre}</strong> (${animal.id}) del inventario?`,
      () => {
        Store.remove('animals', id);
        Helpers.showToast(`${animal.nombre} eliminado`, 'warning');
        App.refreshModule();
      }
    );
  }

  function openSpeciesForm() {
    const species = Helpers.getSpecies();
    const html = `
      <div id="speciesListModal">
        ${species.map(sp => `
          <div class="species-row">
            <span class="species-icon">${sp.icono}</span>
            <span class="species-name">${sp.nombre}</span>
            <span class="species-gest">${sp.gestacionDias} días gestación</span>
          </div>
        `).join('')}
      </div>
      <hr style="border-color:rgba(255,255,255,0.1);margin:1rem 0;">
      <h3 style="margin-bottom:.75rem;color:var(--text-secondary);">Añadir nueva especie</h3>
      <form class="form-grid" id="speciesForm">
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input class="form-input" id="sp_nombre" placeholder="Ej: Conejo">
        </div>
        <div class="form-group">
          <label class="form-label">Icono (emoji)</label>
          <input class="form-input" id="sp_icono" placeholder="🐰" maxlength="4">
        </div>
        <div class="form-group">
          <label class="form-label">Días de gestación</label>
          <input class="form-input" type="number" id="sp_gestacion" placeholder="31" min="1">
        </div>
      </form>
    `;
    Helpers.openModal('Gestión de Especies', html, {
      submitText: 'Añadir Especie',
      onSubmit: (overlay) => {
        const nombre = overlay.querySelector('#sp_nombre').value.trim();
        const icono = overlay.querySelector('#sp_icono').value.trim() || '🐾';
        const gestacionDias = parseInt(overlay.querySelector('#sp_gestacion').value) || 30;
        if (!nombre) { Helpers.showToast('Indica un nombre para la especie', 'error'); return false; }
        const existing = Store.filter('especies', s => s.nombre.toLowerCase() === nombre.toLowerCase());
        if (existing.length > 0) { Helpers.showToast('Esa especie ya existe', 'error'); return false; }
        Store.add('especies', { nombre, icono, gestacionDias });
        Helpers.showToast(`Especie "${nombre}" añadida`);
        App.refreshModule();
      },
    });
  }

  return { render, setFilter, openForm, confirmDelete, openSpeciesForm };
})();
