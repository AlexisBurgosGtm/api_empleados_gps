const EmpresasView = (() => {
  const empresasBody = document.getElementById('empresas-body');
  const newBtn = document.getElementById('empresa-new-btn');
  const form = document.getElementById('empresa-form');
  const modalElement = document.getElementById('empresa-modal');
  const modalTitle = document.getElementById('empresa-modal-title');
  const empnitInput = document.getElementById('empresa-empnit');
  const nombreInput = document.getElementById('empresa-nombre-input');
  const claveInput = document.getElementById('empresa-clave');
  const tipoInput = document.getElementById('empresa-tipo');
  const habilitadoInput = document.getElementById('empresa-habilitado');

  let modal = null;
  let editingEmpnit = null;

  const escapeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const authHeaders = () => window.AppShell.authHeaders();

  const getModal = () => {
    if (!modal) {
      modal = new bootstrap.Modal(modalElement);
    }

    return modal;
  };

  const renderRows = (empresas) => {
    if (!empresas.length) {
      empresasBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-muted text-center">Sin empresas registradas</td>
        </tr>
      `;
      return;
    }

    empresasBody.innerHTML = empresas
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
              >
                ${escapeHtml(item.habilitado)}
              </button>
            </td>
            <td class="empresas-actions">
              <button type="button" class="btn btn-sm btn-outline-light edit-btn" data-empnit="${escapeHtml(item.empnit)}">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button type="button" class="btn btn-sm btn-outline-danger delete-btn" data-empnit="${escapeHtml(item.empnit)}">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>
        `,
      )
      .join('');
  };

  const load = async () => {
    try {
      const response = await fetch('/api/empresas', { headers: authHeaders() });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || 'No se pudieron cargar las empresas');
      }

      renderRows(payload.empresas || []);
    } catch (error) {
      empresasBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-danger text-center">${escapeHtml(error.message)}</td>
        </tr>
      `;
    }
  };

  const openModal = (empresa = null) => {
    editingEmpnit = empresa?.empnit ?? null;
    modalTitle.textContent = editingEmpnit ? 'Editar empresa' : 'Nueva empresa';
    empnitInput.value = empresa?.empnit ?? '';
    empnitInput.disabled = Boolean(editingEmpnit);
    nombreInput.value = empresa?.empresa ?? '';
    claveInput.value = empresa?.clave ?? '';
    tipoInput.value = empresa?.tipo ?? 'CLIENTE';
    habilitadoInput.value = empresa?.habilitado ?? 'SI';
    getModal().show();
  };

  const findEmpresa = async (empnit) => {
    const response = await fetch('/api/empresas', { headers: authHeaders() });
    const payload = await response.json();
    return (payload.empresas || []).find((item) => item.empnit === empnit) ?? null;
  };

  const save = async (event) => {
    event.preventDefault();

    const body = {
      empnit: empnitInput.value.trim(),
      empresa: nombreInput.value.trim(),
      clave: claveInput.value.trim(),
      tipo: tipoInput.value,
      habilitado: habilitadoInput.value,
    };

    const url = editingEmpnit ? `/api/empresas/${encodeURIComponent(editingEmpnit)}` : '/api/empresas';
    const method = editingEmpnit ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || 'No se pudo guardar la empresa');
      }

      getModal().hide();
      await load();
      await Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: editingEmpnit ? 'Empresa actualizada' : 'Empresa creada',
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message,
        confirmButtonColor: '#0a0a0a',
      });
    }
  };

  const toggleHabilitado = async (empnit) => {
    try {
      const response = await fetch(`/api/empresas/${encodeURIComponent(empnit)}/habilitado`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || 'No se pudo cambiar el estado');
      }

      await load();
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message,
        confirmButtonColor: '#0a0a0a',
      });
    }
  };

  const remove = async (empnit) => {
    const result = await Swal.fire({
      title: '¿Eliminar empresa?',
      text: empnit,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#525252',
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/empresas/${encodeURIComponent(empnit)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || 'No se pudo eliminar la empresa');
      }

      await load();
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message,
        confirmButtonColor: '#0a0a0a',
      });
    }
  };

  const init = () => {
    newBtn?.addEventListener('click', () => openModal());
    form?.addEventListener('submit', (event) => {
      void save(event);
    });

    empresasBody?.addEventListener('click', (event) => {
      const target = event.target.closest('button');
      if (!target) {
        return;
      }

      const empnit = target.dataset.empnit;
      if (!empnit) {
        return;
      }

      if (target.classList.contains('habilitado-toggle')) {
        void toggleHabilitado(empnit);
        return;
      }

      if (target.classList.contains('edit-btn')) {
        void findEmpresa(empnit).then((empresa) => {
          if (empresa) {
            openModal(empresa);
          }
        });
        return;
      }

      if (target.classList.contains('delete-btn')) {
        void remove(empnit);
      }
    });
  };

  return { init, load };
})();

window.EmpresasView = EmpresasView;
