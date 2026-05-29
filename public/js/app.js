const STORAGE_KEY = 'gps_empleados_session';

const views = {
  login: document.getElementById('view-login'),
  dashboard: document.getElementById('view-dashboard'),
};

const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const empresaNombre = document.getElementById('empresa-nombre');
const empleadosCount = document.getElementById('empleados-count');
const refreshBtn = document.getElementById('refresh-btn');
const logoutBtn = document.getElementById('logout-btn');
const mapLoading = document.getElementById('map-loading');

let map = null;
let markersLayer = null;
let session = null;

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
  views[name].classList.add('active');
};

const authHeaders = () => ({
  Authorization: `Bearer ${session.token}`,
  'Content-Type': 'application/json',
});

const setLoading = (visible) => {
  mapLoading.classList.toggle('d-none', !visible);
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

const clearMarkers = () => {
  if (markersLayer) {
    markersLayer.clearLayers();
  }
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

    marker.bindPopup(`
      <strong>${escapeHtml(item.empleado)}</strong><br />
      ${escapeHtml(item.codigo)}<br />
      ${escapeHtml(item.fecha)} · ${escapeHtml(item.hora)}
    `);

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

const loadTracking = async ({ silent = false } = {}) => {
  if (!session?.token) {
    return;
  }

  if (!silent) {
    setLoading(true);
  }

  try {
    const response = await fetch('/api/tracking', {
      headers: authHeaders(),
    });

    const payload = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        showView('login');
        await Swal.fire({
          icon: 'warning',
          title: 'Sesión expirada',
          text: 'Inicie sesión nuevamente.',
          confirmButtonColor: '#0a0a0a',
        });
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
    showView('dashboard');
    empresaNombre.textContent = payload.empresa;
    await loadTracking({ silent: true });
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

logoutBtn.addEventListener('click', async () => {
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
  showView('login');
});

const bootstrap = async () => {
  session = getSession();

  if (session?.token) {
    showView('dashboard');
    empresaNombre.textContent = session.empresa || '—';
    await loadTracking({ silent: true });
  } else {
    showView('login');
  }
};

bootstrap();
