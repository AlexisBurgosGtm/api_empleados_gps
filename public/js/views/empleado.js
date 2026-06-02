import { apiGet } from '../core/api.js';
import { alertError } from '../core/auth.js';
import { navigate } from '../core/router.js';
import { getSelectedFecha } from '../core/state.js';
import { formatFechaDisplay, escapeHtml } from '../core/utils.js';
import { renderAppPage, renderPageHeader } from '../components/layout.js';
import { createRouteIcon, createMap, destroyMap, fitMarkers } from '../components/mapHelpers.js';

export const mount = async (root, params) => {
  const codigo = params.codigo;
  let fecha = getSelectedFecha();
  const mapRef = { current: null };
  const layerRef = { current: null };

  root.innerHTML = renderAppPage({
    nav: 'mapa',
    header: renderPageHeader({
      badge: 'Empleado',
      title: '—',
      actions: `
        <a href="/mapa" class="btn btn-outline-light btn-sm" data-nav>
          <i class="fa-solid fa-arrow-left"></i> Volver
        </a>
        <span id="employee-fecha" class="header-meta"></span>
        <span id="employee-codigo" class="header-meta"></span>
      `,
    }),
    body: `
      <div class="employee-layout">
        <aside class="employee-sidebar">
          <div class="detail-card">
            <div class="detail-card-header">
              <h3>Sin ubicación</h3>
              <span id="sin-ubicacion-count" class="detail-count">0 registros</span>
            </div>
            <div class="detail-table-wrap">
              <table class="table table-dark table-sm detail-table mb-0">
                <thead><tr><th>Hora</th></tr></thead>
                <tbody id="sin-ubicacion-body">
                  <tr><td class="text-muted">Cargando...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </aside>
        <div class="employee-map-stage">
          <div id="employee-map"></div>
          <div id="employee-map-loading" class="map-loading hidden">
            <div class="spinner-border text-light" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
          </div>
        </div>
      </div>
    `,
    className: 'view-empleado',
  });

  const titleEl = () => root.querySelector('.page-title');
  const fechaEl = () => root.querySelector('#employee-fecha');
  const codigoEl = () => root.querySelector('#employee-codigo');
  const sinCountEl = () => root.querySelector('#sin-ubicacion-count');
  const sinBodyEl = () => root.querySelector('#sin-ubicacion-body');
  const loadingEl = () => root.querySelector('#employee-map-loading');

  const setLoading = (visible) => {
    loadingEl()?.classList.toggle('hidden', !visible);
  };

  const renderSinUbicacion = (registros) => {
    sinCountEl().textContent = `${registros.length} registro${registros.length === 1 ? '' : 's'}`;

    if (!registros.length) {
      sinBodyEl().innerHTML = `<tr><td class="text-muted">Sin registros</td></tr>`;
      return;
    }

    sinBodyEl().innerHTML = registros
      .map((item) => `<tr><td>${escapeHtml(item.hora)}</td></tr>`)
      .join('');
  };

  const renderRoute = (registros) => {
    if (!mapRef.current || !layerRef.current) {
      return;
    }

    layerRef.current.clearLayers();
    const bounds = [];

    registros.forEach((item) => {
      const latLng = [item.latitud, item.longitud];
      bounds.push(latLng);
      const marker = L.marker(latLng, { icon: createRouteIcon(item.hora) });
      layerRef.current.addLayer(marker);
    });

    if (!bounds.length) {
      mapRef.current.setView([14.6349, -90.5069], 12);
      return;
    }

    fitMarkers(mapRef.current, bounds);
  };

  const loadDetail = async () => {
    setLoading(true);

    try {
      const payload = await apiGet(
        `/api/tracking/${encodeURIComponent(codigo)}?fecha=${encodeURIComponent(fecha)}`,
      );

      fecha = payload.fecha || fecha;
      titleEl().textContent = payload.empleado || '—';
      fechaEl().textContent = payload.fecha ? `Fecha: ${formatFechaDisplay(payload.fecha)}` : '';
      codigoEl().textContent = payload.codigo ? `CODIGO: ${payload.codigo}` : '';

      renderSinUbicacion(payload.sinUbicacion || []);

      if (!mapRef.current) {
        mapRef.current = createMap('employee-map', layerRef);
      }

      renderRoute(payload.conUbicacion || []);
    } catch (error) {
      if (error.message !== 'Sesión expirada') {
        await alertError('Error', error.message);
      }
      await navigate('/mapa');
    } finally {
      setLoading(false);
    }
  };

  await loadDetail();

  return () => {
    destroyMap(mapRef, layerRef);
  };
};
