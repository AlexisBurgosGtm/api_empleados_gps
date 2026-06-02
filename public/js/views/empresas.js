import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../core/api.js';
import { logout, toast, alertError, alertWarning, confirmDialog } from '../core/auth.js';
import { navigate } from '../core/router.js';
import { escapeHtml } from '../core/utils.js';
import { renderAppPage, renderPageHeader, bindLogout } from '../components/layout.js';
import { iconEdit, iconPlus, iconTrash } from '../components/icons.js';

export const mount = async (root) => {
  let empresasCache = [];
  let editingEmpnit = null;
  let modal = null;

  const renderShell = () => {
    root.innerHTML = `
      ${renderAppPage({
        nav: 'empresas',
        header: renderPageHeader({
          badge: 'Administración',
          title: 'Empresas',
          actions: '',
        }),
        body: `
          <div class="empresas-panel">
            <div class="empresas-table-wrap">
              <table class="table table-dark empresas-table mb-0">
                <thead>
                  <tr>
                    <th>EMPNIT</th>
                    <th>Empresa</th>
                    <th>Tipo</th>
                    <th>Clave</th>
                    <th>Habilitado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="empresas-body">
                  <tr><td colspan="6" class="text-muted text-center">Cargando...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <button
            type="button"
            class="empresas-fab"
            id="empresa-new-btn"
            title="Nueva empresa"
            aria-label="Nueva empresa"
          >
            ${iconPlus('empresas-icon empresas-icon-fab')}
          </button>
        `,
        className: 'view-empresas',
      })}

      <div class="modal fade" id="empresa-modal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content empresa-modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="empresa-modal-title">Nueva empresa</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <form id="empresa-form">
              <div class="modal-body">
                <div class="mb-3">
                  <label for="empresa-empnit" class="form-label">EMPNIT</label>
                  <input type="text" class="form-control" id="empresa-empnit" required />
                </div>
                <div class="mb-3">
                  <label for="empresa-nombre-input" class="form-label">Empresa</label>
                  <input type="text" class="form-control" id="empresa-nombre-input" required />
                </div>
                <div class="mb-3">
                  <label for="empresa-clave" class="form-label">Clave</label>
                  <input type="text" class="form-control" id="empresa-clave" required />
                </div>
                <div class="mb-0">
                  <label for="empresa-tipo" class="form-label">Tipo</label>
                  <select class="form-select" id="empresa-tipo">
                    <option value="CLIENTE">CLIENTE</option>
                    <option value="ROOT">ROOT</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-light">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  };

  renderShell();

  const tbody = () => root.querySelector('#empresas-body');
  const modalEl = () => root.querySelector('#empresa-modal');
  const form = () => root.querySelector('#empresa-form');

  const getModal = () => {
    if (!modal && modalEl()) {
      modal = bootstrap.Modal.getOrCreateInstance(modalEl());
    }
    return modal;
  };

  const findEmpresa = (empnit) =>
    empresasCache.find((item) => String(item.empnit).trim() === String(empnit).trim()) ?? null;

  const renderRows = (empresas) => {
    if (!empresas.length) {
      tbody().innerHTML = `
        <tr><td colspan="6" class="text-muted text-center">Sin empresas registradas</td></tr>
      `;
      return;
    }

    tbody().innerHTML = empresas
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.empnit)}</td>
            <td>${escapeHtml(item.empresa)}</td>
            <td><span class="tipo-badge">${escapeHtml(item.tipo)}</span></td>
            <td>${escapeHtml(item.clave)}</td>
            <td>
              <button
                type="button"
                class="habilitado-toggle ${item.habilitado === 'SI' ? 'is-active' : 'is-inactive'}"
                data-empnit="${escapeHtml(item.empnit)}"
              >${escapeHtml(item.habilitado)}</button>
            </td>
            <td class="empresas-actions">
              <button type="button" class="empresas-action-btn edit-btn" data-empnit="${escapeHtml(item.empnit)}" title="Editar" aria-label="Editar">
                ${iconEdit()}
              </button>
              <button type="button" class="empresas-action-btn delete-btn" data-empnit="${escapeHtml(item.empnit)}" title="Eliminar" aria-label="Eliminar">
                ${iconTrash()}
              </button>
            </td>
          </tr>
        `,
      )
      .join('');
  };

  const load = async () => {
    tbody().innerHTML = `
      <tr><td colspan="6" class="text-muted text-center">Cargando...</td></tr>
    `;

    try {
      const payload = await apiGet('/api/empresas');
      empresasCache = payload.empresas || [];
      renderRows(empresasCache);
    } catch (error) {
      const message =
        error.status === 403
          ? 'Acceso denegado. Inicie sesión con un usuario ROOT.'
          : error.message;
      tbody().innerHTML = `
        <tr><td colspan="6" class="text-danger text-center">${escapeHtml(message)}</td></tr>
      `;
    }
  };

  const openModal = (empresa = null) => {
    editingEmpnit = empresa?.empnit ?? null;
    root.querySelector('#empresa-modal-title').textContent = editingEmpnit
      ? 'Editar empresa'
      : 'Nueva empresa';
    root.querySelector('#empresa-empnit').value = empresa?.empnit ?? '';
    root.querySelector('#empresa-empnit').disabled = Boolean(editingEmpnit);
    root.querySelector('#empresa-nombre-input').value = empresa?.empresa ?? '';
    root.querySelector('#empresa-clave').value = empresa?.clave ?? '';
    root.querySelector('#empresa-tipo').value = empresa?.tipo ?? 'CLIENTE';
    getModal()?.show();
  };

  const onSave = async (event) => {
    event.preventDefault();

    const body = {
      empnit: root.querySelector('#empresa-empnit').value.trim(),
      empresa: root.querySelector('#empresa-nombre-input').value.trim(),
      clave: root.querySelector('#empresa-clave').value.trim(),
      tipo: root.querySelector('#empresa-tipo').value,
    };

    if (!editingEmpnit) {
      body.habilitado = 'SI';
    }

    if (!body.empnit || !body.empresa || !body.clave) {
      await alertWarning('Campos requeridos', 'Complete EMPNIT, empresa y clave.');
      return;
    }

    const isEdit = Boolean(editingEmpnit);
    const url = isEdit
      ? `/api/empresas/${encodeURIComponent(editingEmpnit)}`
      : '/api/empresas';

    try {
      if (isEdit) {
        await apiPut(url, body);
        await toast('Empresa actualizada');
      } else {
        await apiPost(url, body);
        await toast('Empresa creada');
      }

      getModal()?.hide();
      editingEmpnit = null;
      await load();
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        await alertError('Error', error.message);
      }
    }
  };

  const toggleHabilitado = async (empnit) => {
    try {
      await apiPatch(`/api/empresas/${encodeURIComponent(empnit)}/habilitado`);
      await load();
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        await alertError('Error', error.message);
      }
    }
  };

  const remove = async (empnit) => {
    const confirmed = await confirmDialog({
      title: '¿Eliminar empresa?',
      text: empnit,
      icon: 'warning',
      confirmText: 'Eliminar',
      confirmColor: '#dc2626',
    });

    if (!confirmed) {
      return;
    }

    try {
      await apiDelete(`/api/empresas/${encodeURIComponent(empnit)}`);
      await toast('Empresa eliminada');
      await load();
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        await alertError('Error', error.message);
      }
    }
  };

  const onTableClick = (event) => {
    const toggleBtn = event.target.closest('.habilitado-toggle');
    if (toggleBtn?.dataset.empnit) {
      void toggleHabilitado(toggleBtn.dataset.empnit);
      return;
    }

    const editBtn = event.target.closest('.edit-btn');
    if (editBtn?.dataset.empnit) {
      const empresa = findEmpresa(editBtn.dataset.empnit);
      if (empresa) {
        openModal(empresa);
      }
      return;
    }

    const deleteBtn = event.target.closest('.delete-btn');
    if (deleteBtn?.dataset.empnit) {
      void remove(deleteBtn.dataset.empnit);
    }
  };

  const onModalHidden = () => {
    editingEmpnit = null;
    root.querySelector('#empresa-empnit').disabled = false;
    form()?.reset();
  };

  const onLogout = async () => {
    if (await logout()) {
      await navigate('/login', { replace: true });
    }
  };

  root.querySelector('#empresa-new-btn')?.addEventListener('click', () => openModal());
  form()?.addEventListener('submit', onSave);
  tbody()?.addEventListener('click', onTableClick);
  modalEl()?.addEventListener('hidden.bs.modal', onModalHidden);
  bindLogout(root, onLogout);

  await load();

  return () => {
    getModal()?.hide();
    modal?.dispose?.();
    modal = null;
  };
};
