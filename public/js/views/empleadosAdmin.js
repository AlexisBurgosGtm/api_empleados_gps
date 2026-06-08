import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../core/api.js';
import { logout, toast, alertError, alertWarning, confirmDialog } from '../core/auth.js';
import { navigate } from '../core/router.js';
import { escapeHtml } from '../core/utils.js';
import { renderAppPage, renderPageHeader, bindLogout } from '../components/layout.js';
import { iconEdit, iconPlus, iconTrash } from '../components/icons.js';

const TIPOS_EMPLEADO = ['VENDEDOR', 'TECNICO', 'SUPERVISOR', 'REPARTIDOR', 'PILOTO'];

const renderTipoOptions = (selected = '') =>
  ['<option value="">Seleccione tipo</option>']
    .concat(
      TIPOS_EMPLEADO.map((tipo) => {
        const isSelected = String(selected).trim().toUpperCase() === tipo;
        return `<option value="${tipo}" ${isSelected ? 'selected' : ''}>${tipo}</option>`;
      }),
    )
    .join('');

export const mount = async (root) => {
  let empresasCache = [];
  let empleadosCache = [];
  let selectedEmpnit = '';
  let editingCodigo = null;
  let modal = null;

  const renderShell = () => {
    root.innerHTML = `
      ${renderAppPage({
        nav: 'empleados',
        header: renderPageHeader({
          badge: 'Administración',
          title: 'Empleados',
          actions: `
            <label class="date-filter-label" for="empleados-empresa-filter">Empresa</label>
            <select class="form-select form-select-sm empleados-filter" id="empleados-empresa-filter">
              <option value="">Seleccione empresa</option>
            </select>
          `,
        }),
        body: `
          <div class="empresas-panel">
            <div class="empresas-table-wrap">
              <table class="table table-dark empresas-table mb-0">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Empleado</th>
                    <th>Tipo</th>
                    <th>Teléfono</th>
                    <th>Habilitado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="empleados-body">
                  <tr><td colspan="6" class="text-muted text-center">Seleccione una empresa</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <button
            type="button"
            class="empresas-fab"
            id="empleado-new-btn"
            title="Nuevo empleado"
            aria-label="Nuevo empleado"
            disabled
          >
            ${iconPlus('empresas-icon empresas-icon-fab')}
          </button>
        `,
        className: 'view-empleados',
      })}

      <div class="modal fade" id="empleado-modal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content empresa-modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="empleado-modal-title">Nuevo empleado</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <form id="empleado-form">
              <div class="modal-body">
                <div class="mb-3">
                  <label for="empleado-empresa" class="form-label">Empresa</label>
                  <select class="form-select" id="empleado-empresa" required></select>
                </div>
                <div class="mb-3">
                  <label for="empleado-codigo" class="form-label">Código</label>
                  <input type="text" class="form-control" id="empleado-codigo" required />
                </div>
                <div class="mb-3">
                  <label for="empleado-nombre" class="form-label">Empleado</label>
                  <input type="text" class="form-control" id="empleado-nombre" required />
                </div>
                <div class="mb-3">
                  <label for="empleado-tipo" class="form-label">Tipo</label>
                  <select class="form-select" id="empleado-tipo" required>
                    ${renderTipoOptions()}
                  </select>
                </div>
                <div class="mb-0">
                  <label for="empleado-telefono" class="form-label">Teléfono</label>
                  <input type="text" class="form-control" id="empleado-telefono" />
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

  const tbody = () => root.querySelector('#empleados-body');
  const filterSelect = () => root.querySelector('#empleados-empresa-filter');
  const newBtn = () => root.querySelector('#empleado-new-btn');
  const modalEl = () => root.querySelector('#empleado-modal');
  const form = () => root.querySelector('#empleado-form');
  const modalEmpresaSelect = () => root.querySelector('#empleado-empresa');

  const getModal = () => {
    if (!modal && modalEl()) {
      modal = bootstrap.Modal.getOrCreateInstance(modalEl());
    }
    return modal;
  };

  const renderEmpresaOptions = (select, { includeEmpty = false, selected = '' } = {}) => {
    const options = [];

    if (includeEmpty) {
      options.push('<option value="">Seleccione empresa</option>');
    }

    empresasCache.forEach((item) => {
      const value = escapeHtml(item.empnit);
      const label = escapeHtml(`${item.empresa} (${item.empnit})`);
      const isSelected = String(item.empnit).trim() === String(selected).trim();
      options.push(
        `<option value="${value}" ${isSelected ? 'selected' : ''}>${label}</option>`,
      );
    });

    select.innerHTML = options.join('');
  };

  const findEmpleado = (codigo) =>
    empleadosCache.find((item) => String(item.codigo).trim() === String(codigo).trim()) ?? null;

  const setFabEnabled = (enabled) => {
    const button = newBtn();
    if (button) {
      button.disabled = !enabled;
    }
  };

  const renderRows = (empleados) => {
    if (!selectedEmpnit) {
      tbody().innerHTML = `
        <tr><td colspan="6" class="text-muted text-center">Seleccione una empresa</td></tr>
      `;
      return;
    }

    if (!empleados.length) {
      tbody().innerHTML = `
        <tr><td colspan="6" class="text-muted text-center">Sin empleados registrados</td></tr>
      `;
      return;
    }

    tbody().innerHTML = empleados
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.codigo)}</td>
            <td>${escapeHtml(item.empleado)}</td>
            <td>${item.tipo ? `<span class="tipo-badge">${escapeHtml(item.tipo)}</span>` : '—'}</td>
            <td>${escapeHtml(item.telefono || '—')}</td>
            <td>
              <button
                type="button"
                class="habilitado-toggle ${item.habilitado === 'SI' ? 'is-active' : 'is-inactive'}"
                data-codigo="${escapeHtml(item.codigo)}"
              >${escapeHtml(item.habilitado)}</button>
            </td>
            <td class="empresas-actions">
              <button type="button" class="empresas-action-btn edit-btn" data-codigo="${escapeHtml(item.codigo)}" title="Editar" aria-label="Editar">
                ${iconEdit()}
              </button>
              <button type="button" class="empresas-action-btn delete-btn" data-codigo="${escapeHtml(item.codigo)}" title="Eliminar" aria-label="Eliminar">
                ${iconTrash()}
              </button>
            </td>
          </tr>
        `,
      )
      .join('');
  };

  const loadEmpresas = async () => {
    try {
      const payload = await apiGet('/api/empresas');
      empresasCache = payload.empresas || [];
      renderEmpresaOptions(filterSelect(), { includeEmpty: true, selected: selectedEmpnit });
      renderEmpresaOptions(modalEmpresaSelect(), { selected: selectedEmpnit });
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        await alertError('Error', error.message);
      }
    }
  };

  const loadEmpleados = async () => {
    if (!selectedEmpnit) {
      empleadosCache = [];
      renderRows([]);
      setFabEnabled(false);
      return;
    }

    tbody().innerHTML = `
      <tr><td colspan="6" class="text-muted text-center">Cargando...</td></tr>
    `;
    setFabEnabled(true);

    try {
      const payload = await apiGet(
        `/api/empleados?empnit=${encodeURIComponent(selectedEmpnit)}`,
      );
      empleadosCache = payload.empleados || [];
      renderRows(empleadosCache);
    } catch (error) {
      const message =
        error.status === 403
          ? 'Acceso denegado. Inicie sesión con un usuario ROOT.'
          : error.message;
      tbody().innerHTML = `
        <tr><td colspan="6" class="text-danger text-center">${escapeHtml(message)}</td></tr>
      `;
      setFabEnabled(false);
    }
  };

  const openModal = (empleado = null) => {
    if (!selectedEmpnit && !empleado) {
      void alertWarning('Empresa requerida', 'Seleccione una empresa antes de crear un empleado.');
      return;
    }

    editingCodigo = empleado?.codigo ?? null;
    root.querySelector('#empleado-modal-title').textContent = editingCodigo
      ? 'Editar empleado'
      : 'Nuevo empleado';

    renderEmpresaOptions(modalEmpresaSelect(), {
      selected: empleado?.empnit ?? selectedEmpnit,
    });

    const empresaField = modalEmpresaSelect();
    empresaField.value = empleado?.empnit ?? selectedEmpnit;
    empresaField.disabled = Boolean(editingCodigo);

    root.querySelector('#empleado-codigo').value = empleado?.codigo ?? '';
    root.querySelector('#empleado-codigo').disabled = Boolean(editingCodigo);
    root.querySelector('#empleado-nombre').value = empleado?.empleado ?? '';
    root.querySelector('#empleado-tipo').innerHTML = renderTipoOptions(empleado?.tipo ?? '');
    root.querySelector('#empleado-telefono').value = empleado?.telefono ?? '';
    getModal()?.show();
  };

  const onSave = async (event) => {
    event.preventDefault();

    const empnit = modalEmpresaSelect().value.trim();
    const codigo = root.querySelector('#empleado-codigo').value.trim();
    const empleado = root.querySelector('#empleado-nombre').value.trim();
    const tipo = root.querySelector('#empleado-tipo').value.trim();
    const telefono = root.querySelector('#empleado-telefono').value.trim();

    if (!empnit || !codigo || !empleado || !tipo) {
      await alertWarning('Campos requeridos', 'Complete empresa, código, nombre y tipo.');
      return;
    }

    const isEdit = Boolean(editingCodigo);
    const url = isEdit
      ? `/api/empleados/${encodeURIComponent(empnit)}/${encodeURIComponent(editingCodigo)}`
      : '/api/empleados';

    const body = isEdit
      ? { empleado, tipo, telefono }
      : { empnit, codigo, empleado, tipo, telefono, habilitado: 'SI' };

    try {
      if (isEdit) {
        await apiPut(url, body);
        await toast('Empleado actualizado');
      } else {
        await apiPost(url, body);
        await toast('Empleado creado');
      }

      getModal()?.hide();
      editingCodigo = null;
      selectedEmpnit = empnit;
      filterSelect().value = empnit;
      await loadEmpleados();
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        await alertError('Error', error.message);
      }
    }
  };

  const toggleHabilitado = async (codigo) => {
    if (!selectedEmpnit) {
      return;
    }

    try {
      await apiPatch(
        `/api/empleados/${encodeURIComponent(selectedEmpnit)}/${encodeURIComponent(codigo)}/habilitado`,
      );
      await loadEmpleados();
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        await alertError('Error', error.message);
      }
    }
  };

  const remove = async (codigo) => {
    if (!selectedEmpnit) {
      return;
    }

    const confirmed = await confirmDialog({
      title: '¿Eliminar empleado?',
      text: codigo,
      icon: 'warning',
      confirmText: 'Eliminar',
      confirmColor: '#dc2626',
    });

    if (!confirmed) {
      return;
    }

    try {
      await apiDelete(
        `/api/empleados/${encodeURIComponent(selectedEmpnit)}/${encodeURIComponent(codigo)}`,
      );
      await toast('Empleado eliminado');
      await loadEmpleados();
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        await alertError('Error', error.message);
      }
    }
  };

  const onFilterChange = (event) => {
    selectedEmpnit = event.target.value.trim();
    void loadEmpleados();
  };

  const onTableClick = (event) => {
    const toggleBtn = event.target.closest('.habilitado-toggle');
    if (toggleBtn?.dataset.codigo) {
      void toggleHabilitado(toggleBtn.dataset.codigo);
      return;
    }

    const editBtn = event.target.closest('.edit-btn');
    if (editBtn?.dataset.codigo) {
      const empleado = findEmpleado(editBtn.dataset.codigo);
      if (empleado) {
        openModal(empleado);
      }
      return;
    }

    const deleteBtn = event.target.closest('.delete-btn');
    if (deleteBtn?.dataset.codigo) {
      void remove(deleteBtn.dataset.codigo);
    }
  };

  const onModalHidden = () => {
    editingCodigo = null;
    root.querySelector('#empleado-codigo').disabled = false;
    modalEmpresaSelect().disabled = false;
    form()?.reset();
    root.querySelector('#empleado-tipo').innerHTML = renderTipoOptions();
    renderEmpresaOptions(modalEmpresaSelect(), { selected: selectedEmpnit });
  };

  const onLogout = async () => {
    if (await logout()) {
      await navigate('/login', { replace: true });
    }
  };

  filterSelect()?.addEventListener('change', onFilterChange);
  newBtn()?.addEventListener('click', () => openModal());
  form()?.addEventListener('submit', onSave);
  tbody()?.addEventListener('click', onTableClick);
  modalEl()?.addEventListener('hidden.bs.modal', onModalHidden);
  bindLogout(root, onLogout);

  await loadEmpresas();
  await loadEmpleados();

  return () => {
    getModal()?.hide();
    modal?.dispose?.();
    modal = null;
  };
};
