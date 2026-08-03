// ============================================================
// helpers.js — Utilidades generales
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

window.Helpers = (() => {

  // ---- Date formatting ----

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }

  function toInputDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  }

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  function addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  }

  function daysAgo(dateStr) {
    const d = daysUntil(dateStr);
    return d !== null ? -d : null;
  }

  // ---- Age calculation ----

  function calcAge(birthDate) {
    if (!birthDate) return '—';
    const birth = new Date(birthDate);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) { years--; months += 12; }
    if (now.getDate() < birth.getDate()) {
      months--;
      if (months < 0) { years--; months += 12; }
    }
    if (years > 0) return `${years} año${years > 1 ? 's' : ''}${months > 0 ? `, ${months} mes${months > 1 ? 'es' : ''}` : ''}`;
    if (months > 0) return `${months} mes${months > 1 ? 'es' : ''}`;
    const days = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
    return `${days} día${days !== 1 ? 's' : ''}`;
  }

  // ---- Currency ----

  function formatMoney(amount) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  }

  // ---- Toast notifications ----

  let toastContainer = null;

  function _ensureToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
  }

  function showToast(message, type = 'success') {
    _ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = icons[type] || '📋';
    const msgSpan = document.createElement('span');
    msgSpan.className = 'toast-msg';
    msgSpan.textContent = message;
    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    setTimeout(() => {
      toast.classList.remove('toast-show');
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  // ---- Modal system ----

  function openModal(title, bodyHtml, options = {}) {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${options.wide ? 'modal-wide' : ''}">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close" id="modalClose" aria-label="Cerrar">&times;</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${options.hideFooter ? '' : `
        <div class="modal-footer">
          ${options.hideCancel ? '' : '<button class="btn btn-ghost" id="modalCancel">Cancelar</button>'}
          ${options.hideSubmit ? '' : `<button class="btn btn-primary" id="modalSubmit">${options.submitText || 'Guardar'}</button>`}
        </div>`}
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-active'));

    const close = () => {
      overlay.classList.remove('modal-active');
      setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('#modalClose').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    const cancelBtn = overlay.querySelector('#modalCancel');
    if (cancelBtn) cancelBtn.addEventListener('click', close);

    const submitBtn = overlay.querySelector('#modalSubmit');
    if (submitBtn && options.onSubmit) {
      submitBtn.addEventListener('click', () => {
        const result = options.onSubmit(overlay);
        if (result !== false) close();
      });
    }

    if (options.onOpen) {
      options.onOpen(overlay);
    }

    return { overlay, close };
  }

  function confirmDialog(message, onConfirm) {
    const body = document.createElement('p');
    body.style.cssText = 'text-align:center;padding:1rem 0;';
    body.innerHTML = message; // Asume mensaje controlado por el módulo (negritas, etc.)
    const wrapper = document.createElement('div');
    wrapper.appendChild(body);
    openModal('Confirmar', wrapper.innerHTML, {
      submitText: 'Confirmar',
      onSubmit: () => { onConfirm(); return true; }
    });
  }

  // ---- Table rendering ----

  function renderTable(columns, rows, options = {}) {
    if (rows.length === 0) {
      return `<div class="empty-state">
        <div class="empty-state-icon">${options.emptyIcon || '📋'}</div>
        <p class="empty-state-text">${escapeHtml(options.emptyText || 'No hay registros aún')}</p>
      </div>`;
    }
    let html = '<div class="table-wrapper"><table class="data-table"><thead><tr>';
    columns.forEach(col => {
      html += `<th>${escapeHtml(col.label)}</th>`;
    });
    if (options.actions) html += '<th class="th-actions">Acciones</th>';
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
      html += '<tr class="table-row-enter">';
      columns.forEach(col => {
        const val = col.render ? col.render(row) : (row[col.key] !== undefined && row[col.key] !== null ? escapeHtml(String(row[col.key])) : '—');
        html += `<td>${val}</td>`;
      });
      if (options.actions) {
        html += `<td class="td-actions">${options.actions(row)}</td>`;
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  // ---- Status badge ----

  function badge(text, type) {
    const colors = {
      success: 'badge-success',
      warning: 'badge-warning',
      danger: 'badge-danger',
      info: 'badge-info',
      neutral: 'badge-neutral',
    };
    return `<span class="badge ${colors[type] || 'badge-neutral'}">${escapeHtml(text)}</span>`;
  }

  function estadoBadge(estado) {
    const map = {
      'Activo': 'success',
      'Vendido': 'info',
      'Fallecido': 'neutral',
      'En gestación': 'warning',
      'Nacido': 'success',
      'Perdido': 'danger',
      'Completado': 'success',
      'Pendiente': 'warning',
      'Cancelado': 'neutral',
    };
    return badge(estado, map[estado] || 'neutral');
  }

  // ---- Species helpers ----

  function getSpecies() {
    return Store.getAll('especies');
  }

  function speciesIcon(nombre) {
    const sp = Store.getAll('especies').find(s => s.nombre === nombre);
    return sp ? sp.icono : '🐾';
  }

  function speciesSelect(selected, id = 'especie', includeAll = false) {
    const species = getSpecies();
    let html = `<select class="form-input" id="${id}" name="${id}">`;
    if (includeAll) html += '<option value="">Todas las especies</option>';
    species.forEach(sp => {
      html += `<option value="${sp.nombre}" ${sp.nombre === selected ? 'selected' : ''}>${sp.icono} ${sp.nombre}</option>`;
    });
    html += '</select>';
    return html;
  }

  function animalSelect(selected, id = 'animalId', options = {}) {
    const animals = Store.filter('animals', a => a.estado === 'Activo');
    let filtered = animals;
    if (options.especie) filtered = animals.filter(a => a.especie === options.especie);
    if (options.sexo) filtered = animals.filter(a => a.sexo === options.sexo);
    let html = `<select class="form-input" id="${id}" name="${id}">`;
    if (options.placeholder) html += `<option value="">${options.placeholder}</option>`;
    filtered.forEach(a => {
      const sp = speciesIcon(a.especie);
      html += `<option value="${a.id}" ${a.id === selected ? 'selected' : ''}>${sp} ${a.nombre} (${a.id})</option>`;
    });
    html += '</select>';
    return html;
  }

  // ---- Search & Pagination ----

  // Renderiza una barra de búsqueda que delega al controlador del módulo.
  // El módulo expone un getter `getSearch` para definir qué campos se buscan.
  function renderSearchBox(placeholder, searchInputId = 'tableSearch') {
    return `<input type="search" class="form-input form-input-sm" id="${searchInputId}" placeholder="${escapeHtml(placeholder)}" autocomplete="off">`;
  }

  // Aplica búsqueda en una lista de objetos sobre un conjunto de campos.
  function applySearch(rows, term, fields) {
    if (!term) return rows;
    const t = term.toLowerCase();
    return rows.filter(r => {
      return fields.some(f => {
        const v = typeof f === 'function' ? f(r) : r[f];
        return v !== undefined && v !== null && String(v).toLowerCase().includes(t);
      });
    });
  }

  // Renderiza controles de paginación. Devuelve '' si sólo hay una página.
  function renderPagination(currentPage, totalPages, onChange) {
    if (totalPages <= 1) return '';
    const prevDisabled = currentPage <= 1 ? 'disabled' : '';
    const nextDisabled = currentPage >= totalPages ? 'disabled' : '';
    const window = 2;
    const start = Math.max(1, currentPage - window);
    const end = Math.min(totalPages, currentPage + window);
    let pages = '';
    for (let i = start; i <= end; i++) {
      pages += `<button class="page-btn ${i === currentPage ? 'page-active' : ''}" data-page="${i}">${i}</button>`;
    }
    const safe = (e) => `App.handlePageClick(this, '${onChange}')`;
    return `<div class="pagination">
      <button class="page-btn" ${prevDisabled} data-page="${currentPage - 1}">‹</button>
      ${pages}
      <button class="page-btn" ${nextDisabled} data-page="${currentPage + 1}">›</button>
      <span class="page-info">${currentPage} / ${totalPages}</span>
    </div>`;
  }

  // ---- Health alerts (compartido entre dashboard y módulo Salud) ----

  function getHealthAlerts() {
    const alerts = [];
    Store.getAll('vacunas').forEach(v => {
      if (!v.proximaDosis) return;
      const days = daysUntil(v.proximaDosis);
      const animal = Store.getById('animals', v.animalId);
      const name = animal ? escapeHtml(animal.nombre) : escapeHtml(v.animalId);
      if (days !== null && days < 0) {
        alerts.push({ type: 'danger', icon: '��', text: `${name}: Vacuna "${escapeHtml(v.tipo)}" vencida hace ${Math.abs(days)} días` });
      } else if (days !== null && days <= 7) {
        alerts.push({ type: 'warning', icon: '��', text: `${name}: Vacuna "${escapeHtml(v.tipo)}" en ${days} día${days !== 1 ? 's' : ''}` });
      }
    });
    Store.getAll('desparasitaciones').forEach(d => {
      if (!d.proximaAplicacion) return;
      const days = daysUntil(d.proximaAplicacion);
      const animal = Store.getById('animals', d.animalId);
      const name = animal ? escapeHtml(animal.nombre) : escapeHtml(d.animalId);
      if (days !== null && days < 0) {
        alerts.push({ type: 'danger', icon: '��', text: `${name}: Desparasitación vencida hace ${Math.abs(days)} días` });
      } else if (days !== null && days <= 7) {
        alerts.push({ type: 'warning', icon: '��', text: `${name}: Desparasitación en ${days} día${days !== 1 ? 's' : ''}` });
      }
    });
    Store.getAll('tratamientos').forEach(t => {
      if (t.estado !== 'Activo') return;
      const animal = Store.getById('animals', t.animalId);
      const name = animal ? escapeHtml(animal.nombre) : escapeHtml(t.animalId);
      alerts.push({ type: 'info', icon: '��', text: `${name}: Tratamiento activo — ${escapeHtml(t.medicamento)}` });
    });
    return alerts;
  }

  // ---- Misc ----

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function monthName(monthIndex) {
    return ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][monthIndex];
  }

  function currentMonth() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }

  return {
    formatDate,
    formatDateShort,
    toInputDate,
    today,
    addDays,
    daysUntil,
    daysAgo,
    calcAge,
    formatMoney,
    showToast,
    openModal,
    confirmDialog,
    renderTable,
    badge,
    estadoBadge,
    getSpecies,
    speciesIcon,
    speciesSelect,
    animalSelect,
    escapeHtml,
    monthName,
    currentMonth,
    getHealthAlerts,
    renderSearchBox,
    applySearch,
    renderPagination,
  };
})();
