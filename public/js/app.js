const STORAGE_KEY = 'gps_empleados_session';

const views = {
  login: document.getElementById('view-login'),
  root: document.getElementById('view-root'),
};

const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const empresaNombre = document.getElementById('empresa-nombre');
const empleadosCount = document.getElementById('empleados-count');
const refreshBtn = document.getElementById('refresh-btn');
const logoutBtn = document.getElementById('logout-btn');
const fechaFiltro = document.getElementById('fecha-filtro');
const mapLoading = document.getElementById('map-loading');
const backBtn = document.getElementById('back-btn');
const employeeNombre = document.getElementById('employee-nombre');
const employeeFecha = document.getElementById('employee-fecha');
const employeeCodigo = document.getElementById('employee-codigo');
const sinUbicacionCount = document.getElementById('sin-ubicacion-count');
const sinUbicacionBody = document.getElementById('sin-ubicacion-body');
const employeeMapLoading = document.getElementById('employee-map-loading');

let map = null;
let employeeMap = null;
let markersLayer = null;
let employeeMarkersLayer = null;
let session = null;
let selectedEmployee = null;

const getTodayInputValue = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const getSelectedFecha = () => fechaFiltro.value || getTodayInputValue();

const formatFechaDisplay = (fecha) => {
  const [year, month, day] = fecha.split('-');
  if (!year || !month || !day) {
    return fecha;
  }

  return `${day}/${month}/${year}`;
};

const initFechaFiltro = () => {
  if (!fechaFiltro.value) {
    fechaFiltro.value = getTodayInputValue();
  }
};

const getSession = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveSession = (data) => {
  session = data;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const clearSession = () => {
  session = null;
  sessionStorage.removeItem(STORAGE_KEY);
};

const showView = (name) => {
  Object.values(views).forEach((view) => view.classList.remove('active'));
  views[name]?.classList.add('active');
};

const showDashboard = () => {
  window.RootView?.showPanel('mapa');
};

const showEmployee = () => {
  window.RootView?.showPanel('employee');
};

const invalidateMap = () => {
  if (map) {
    map.invalidateSize();
  }
  if (employeeMap) {
    employeeMap.invalidateSize();
  }
};

const authHeaders = () => ({
  Authorization: `Bearer ${session.token}`,
  'Content-Type': 'application/json',
});

const setLoading = (visible) => {
  mapLoading.classList.toggle('d-none', !visible);
};

const setEmployeeLoading = (visible) => {
  employeeMapLoading.classList.toggle('d-none', !visible);
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const createEmployeeIcon = (empleado, fecha, hora) =>
  L.divIcon({
    className: 'employee-marker',
    html: `
      <div class="employee-marker-wrap">
        <div class="employee-label">
          ${escapeHtml(empleado)}
          <small>${escapeHtml(fecha)} · ${escapeHtml(hora)}</small>
        </div>
        <div class="employee-pin"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

const createRouteIcon = (hora) =>
  L.divIcon({
    className: 'route-marker',
    html: `
      <div class="route-marker-wrap">
        <div class="route-marker-label">${escapeHtml(hora)}</div>
        <div class="route-marker-pin"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

const initMap = () => {
  if (map) {
    return;
  }

  map = L.map('map', {
    zoomControl: true,
    attributionControl: true,
  }).setView([14.6349, -90.5069], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
};

const initEmployeeMap = () => {
  if (employeeMap) {
    return;
  }

  employeeMap = L.map('employee-map', {
    zoomControl: true,
    attributionControl: true,
  }).setView([14.6349, -90.5069], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(employeeMap);

  employeeMarkersLayer = L.layerGroup().addTo(employeeMap);
};

const clearMarkers = () => {
  if (markersLayer) {
    markersLayer.clearLayers();
  }
};

const clearEmployeeMarkers = () => {
  if (employeeMarkersLayer) {
    employeeMarkersLayer.clearLayers();
  }
};

const handleUnauthorized = async () => {
  clearSession();
  showView('login');
  await Swal.fire({
    icon: 'warning',
    title: 'Sesión expirada',
    text: 'Inicie sesión nuevamente.',
    confirmButtonColor: '#0a0a0a',
  });
};

const renderEmpleados = (empleados) => {
  clearMarkers();

  if (!empleados.length) {
    empleadosCount.textContent = '0 empleados';
    return;
  }

  const bounds = [];

  empleados.forEach((item) => {
    if (!item.latitud || !item.longitud) {
      return;
    }

    const latLng = [item.latitud, item.longitud];
    bounds.push(latLng);

    const marker = L.marker(latLng, {
      icon: createEmployeeIcon(item.empleado, item.fecha, item.hora),
    });

    marker.on('click', () => {
      openEmployeeDetail(item);
    });

    markersLayer.addLayer(marker);
  });

  empleadosCount.textContent = `${empleados.length} empleado${empleados.length === 1 ? '' : 's'}`;

  if (bounds.length === 1) {
    map.setView(bounds[0], 15);
  } else if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
  }

  setTimeout(() => map.invalidateSize(), 100);
};

const renderSinUbicacion = (registros) => {
  sinUbicacionCount.textContent = `${registros.length} registro${registros.length === 1 ? '' : 's'}`;

  if (!registros.length) {
    sinUbicacionBody.innerHTML = `
      <tr>
        <td class="text-muted">Sin registros</td>
      </tr>
    `;
    return;
  }

  sinUbicacionBody.innerHTML = registros
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.hora)}</td>
        </tr>
      `,
    )
    .join('');
};

const renderEmployeeRoute = (registros) => {
  clearEmployeeMarkers();

  if (!registros.length) {
    employeeMap.setView([14.6349, -90.5069], 12);
    return;
  }

  const bounds = [];

  registros.forEach((item) => {
    const latLng = [item.latitud, item.longitud];
    bounds.push(latLng);

    const marker = L.marker(latLng, {
      icon: createRouteIcon(item.hora),
    });

    employeeMarkersLayer.addLayer(marker);
  });

  if (bounds.length === 1) {
    employeeMap.setView(bounds[0], 15);
  } else {
    employeeMap.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
  }

  setTimeout(() => employeeMap.invalidateSize(), 100);
};

const loadEmployeeDetail = async (codigo) => {
  if (!session?.token) {
    return;
  }

  setEmployeeLoading(true);

  try {
    const fecha = getSelectedFecha();
    const response = await fetch(
      `/api/tracking/${encodeURIComponent(codigo)}?fecha=${encodeURIComponent(fecha)}`,
      {
        headers: authHeaders(),
      },
    );

    const payload = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      throw new Error(payload.message || 'No se pudo cargar el detalle del empleado');
    }

    selectedEmployee = payload;
    employeeNombre.textContent = payload.empleado || '—';
    employeeFecha.textContent = payload.fecha ? `Fecha: ${formatFechaDisplay(payload.fecha)}` : '';
    employeeCodigo.textContent = payload.codigo ? `CODIGO: ${payload.codigo}` : '';

    renderSinUbicacion(payload.sinUbicacion || []);
    initEmployeeMap();
    renderEmployeeRoute(payload.conUbicacion || []);
  } catch (error) {
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'Error de conexión',
      confirmButtonColor: '#0a0a0a',
    });
    showView('login');
  } finally {
    setEmployeeLoading(false);
  }
};

const openEmployeeDetail = async (item) => {
  showEmployee();
  await loadEmployeeDetail(item.codigo);
};

const enterAuthenticatedApp = async (payload) => {
  initFechaFiltro();
  window.RootView?.enter(payload.tipo ?? 'CLIENTE');
  showView('root');
  empresaNombre.textContent = payload.empresa;
  await loadTracking({ silent: true });
};

const loadTracking = async ({ silent = false } = {}) => {
  if (!session?.token) {
    return;
  }

  if (!silent) {
    setLoading(true);
  }

  try {
    const fecha = getSelectedFecha();
    const response = await fetch(`/api/tracking?fecha=${encodeURIComponent(fecha)}`, {
      headers: authHeaders(),
    });

    const payload = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      throw new Error(payload.message || 'No se pudieron cargar las ubicaciones');
    }

    empresaNombre.textContent = payload.empresa || session.empresa || '—';
    initMap();
    renderEmpleados(payload.empleados || []);

    if (!silent) {
      await Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Mapa actualizado',
        showConfirmButton: false,
        timer: 1800,
        timerProgressBar: true,
      });
    }
  } catch (error) {
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'Error de conexión',
      confirmButtonColor: '#0a0a0a',
    });
  } finally {
    setLoading(false);
  }
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const empnit = loginForm.empnit.value.trim();
  const clave = loginForm.clave.value.trim();

  if (!empnit || !clave) {
    await Swal.fire({
      icon: 'warning',
      title: 'Campos requeridos',
      text: 'Ingrese usuario y contraseña.',
      confirmButtonColor: '#0a0a0a',
    });
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Ingresando...';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empnit, clave }),
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      throw new Error('Respuesta invalida del servidor');
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Usuario o contraseña incorrectos');
      }

      throw new Error(payload.message || 'No se pudo iniciar sesión');
    }

    saveSession(payload);
    loginForm.reset();
    await enterAuthenticatedApp(payload);
  } catch (error) {
    await Swal.fire({
      icon: 'error',
      title: 'Acceso denegado',
      text: error.message || 'No se pudo iniciar sesión',
      confirmButtonColor: '#0a0a0a',
    });
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Iniciar sesión';
  }
});

refreshBtn.addEventListener('click', () => {
  loadTracking();
});

fechaFiltro.addEventListener('change', () => {
  loadTracking({ silent: true });
});

backBtn.addEventListener('click', () => {
  selectedEmployee = null;
  showDashboard();
});

const handleLogout = async () => {
  const result = await Swal.fire({
    title: '¿Cerrar sesión?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Salir',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#0a0a0a',
    cancelButtonColor: '#525252',
  });

  if (!result.isConfirmed) {
    return;
  }

  clearSession();
  clearMarkers();
  clearEmployeeMarkers();
  selectedEmployee = null;
  window.RootView?.setRootMode(false);
  showView('login');
};

logoutBtn.addEventListener('click', () => {
  void handleLogout();
});

const bootstrap = async () => {
  initFechaFiltro();
  window.RootView?.init({ onLogout: handleLogout });
  window.EmpresasView?.init();
  session = getSession();

  if (session?.token) {
    await enterAuthenticatedApp(session);
  } else {
    showView('login');
  }
};

window.AppShell = {
  authHeaders,
  invalidateMap,
};

bootstrap();
