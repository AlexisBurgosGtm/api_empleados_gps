import { apiGet } from '../core/api.js';
import { getSession, logout, toast, alertError } from '../core/auth.js';
import { navigate } from '../core/router.js';
import { getSelectedFecha, setSelectedFecha } from '../core/state.js';
import { getTodayInputValue } from '../core/utils.js';
import { renderAppPage, renderPageHeader, bindLogout, clientLogoutButton } from '../components/layout.js';
import { createEmployeeIcon, createMap, destroyMap, fitMarkers } from '../components/mapHelpers.js';

export const mount = async (root) => {
  const session = getSession();
  let fecha = getSelectedFecha();
  const mapRef = { current: null };
  const layerRef = { current: null };

  const render = () => {
    root.innerHTML = renderAppPage({
      nav: 'mapa',
      header: renderPageHeader({
        badge: 'Empresa',
        title: session.empresa || '—',
        actions: `
          <label class="date-filter-label" for="fecha-filtro">Fecha</label>
          <input type="date" id="fecha-filtro" class="form-control form-control-sm date-filter" value="${fecha}" />
          <span id="empleados-count" class="header-meta">0 empleados</span>
          <button type="button" class="btn btn-outline-light btn-sm" id="refresh-btn">
            <i class="fa-solid fa-rotate"></i> Refrescar
          </button>
          ${clientLogoutButton()}
        `,
      }),
      body: `
        <div class="map-stage">
          <div id="map"></div>
          <div id="map-loading" class="map-loading hidden">
            <div class="spinner-border text-light" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
          </div>
        </div>
      `,
      className: 'view-mapa',
    });
  };

  render();

  const mapEl = () => root.querySelector('#map');
  const loadingEl = () => root.querySelector('#map-loading');
  const countEl = () => root.querySelector('#empleados-count');
  const titleEl = () => root.querySelector('.page-title');
  const fechaInput = () => root.querySelector('#fecha-filtro');

  const setLoading = (visible) => {
    loadingEl()?.classList.toggle('hidden', !visible);
  };

  const renderEmpleados = (empleados) => {
    if (!mapRef.current || !layerRef.current) {
      return;
    }

    layerRef.current.clearLayers();
    const bounds = [];

    empleados.forEach((item) => {
      if (!item.latitud || !item.longitud) {
        return;
      }

      const latLng = [item.latitud, item.longitud];
      bounds.push(latLng);

      const marker = L.marker(latLng, {
        icon: createEmployeeIcon(item.empleado, item.fecha, item.hora),
        interactive: true,
      });

      marker.on('click', () => {
        void navigate(`/empleado/${encodeURIComponent(item.codigo)}`);
      });

      layerRef.current.addLayer(marker);
    });

    countEl().textContent = `${empleados.length} empleado${empleados.length === 1 ? '' : 's'}`;
    fitMarkers(mapRef.current, bounds);
  };

  const loadTracking = async ({ silent = false } = {}) => {
    setLoading(!silent);

    try {
      const payload = await apiGet(`/api/tracking?fecha=${encodeURIComponent(fecha)}`);
      titleEl().textContent = payload.empresa || session.empresa || '—';

      if (!mapRef.current && mapEl()) {
        mapRef.current = createMap('map', layerRef);
      } else {
        setTimeout(() => mapRef.current?.invalidateSize(), 150);
      }

      renderEmpleados(payload.empleados || []);

      if (!silent) {
        await toast('Mapa actualizado');
      }
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        await alertError('Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => void loadTracking();
  const onFechaChange = (event) => {
    fecha = event.target.value || getTodayInputValue();
    setSelectedFecha(fecha);
    void loadTracking({ silent: true });
  };
  const onLogout = async () => {
    if (await logout()) {
      await navigate('/login', { replace: true });
    }
  };

  root.querySelector('#refresh-btn')?.addEventListener('click', onRefresh);
  fechaInput()?.addEventListener('change', onFechaChange);
  bindLogout(root, onLogout);

  await loadTracking({ silent: true });

  return () => {
    destroyMap(mapRef, layerRef);
  };
};
