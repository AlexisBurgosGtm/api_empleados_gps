import { apiGet } from '../core/api.js';

import { alertError } from '../core/auth.js';

import { navigate } from '../core/router.js';

import { getSelectedFecha } from '../core/state.js';

import { formatFechaDisplay } from '../core/utils.js';

import { renderAppPage, renderPageHeader } from '../components/layout.js';

import { createRouteIcon, bindRouteMarkerToggle, createRoutePolyline, createMap, destroyMap, fitMarkers } from '../components/mapHelpers.js';



export const mount = async (root, params) => {

  const codigo = params.codigo;

  let fecha = getSelectedFecha();

  let horaInicio = '00:00';

  let horaFin = '23:59';

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

        <label class="date-filter-label" for="hora-inicio-filtro">Desde</label>

        <input type="time" id="hora-inicio-filtro" class="form-control form-control-sm date-filter" value="${horaInicio}" />

        <label class="date-filter-label" for="hora-fin-filtro">Hasta</label>

        <input type="time" id="hora-fin-filtro" class="form-control form-control-sm date-filter" value="${horaFin}" />

      `,

    }),

    body: `

      <div class="map-stage">

        <div id="employee-map"></div>

        <div id="employee-map-loading" class="map-loading hidden">

          <div class="spinner-border text-light" role="status">

            <span class="visually-hidden">Cargando...</span>

          </div>

        </div>

      </div>

    `,

    className: 'view-empleado',

  });



  const titleEl = () => root.querySelector('.page-title');

  const fechaEl = () => root.querySelector('#employee-fecha');

  const codigoEl = () => root.querySelector('#employee-codigo');

  const horaInicioInput = () => root.querySelector('#hora-inicio-filtro');

  const horaFinInput = () => root.querySelector('#hora-fin-filtro');

  const loadingEl = () => root.querySelector('#employee-map-loading');



  const setLoading = (visible) => {

    loadingEl()?.classList.toggle('hidden', !visible);

  };



  const renderRoute = (registros) => {

    if (!mapRef.current || !layerRef.current) {

      return;

    }



    layerRef.current.clearLayers();

    const bounds = [];



    registros.forEach((item) => {

      bounds.push([item.latitud, item.longitud]);

    });



    const routeLine = createRoutePolyline(bounds);

    if (routeLine) {

      layerRef.current.addLayer(routeLine);

    }



    registros.forEach((item) => {

      const latLng = [item.latitud, item.longitud];

      const marker = L.marker(latLng, { icon: createRouteIcon(item.hora) });

      bindRouteMarkerToggle(marker, layerRef.current, mapRef.current);

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

      const query = new URLSearchParams({

        fecha,

        horaInicio,

        horaFin,

      });



      const payload = await apiGet(

        `/api/tracking/${encodeURIComponent(codigo)}?${query.toString()}`,

      );



      fecha = payload.fecha || fecha;

      horaInicio = payload.horaInicio || horaInicio;

      horaFin = payload.horaFin || horaFin;

      titleEl().textContent = payload.empleado || '—';

      fechaEl().textContent = payload.fecha ? `Fecha: ${formatFechaDisplay(payload.fecha)}` : '';

      codigoEl().textContent = payload.codigo ? `CODIGO: ${payload.codigo}` : '';

      horaInicioInput().value = horaInicio;

      horaFinInput().value = horaFin;



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



  const onTimeFilterChange = () => {

    const nextInicio = horaInicioInput()?.value.trim() || '00:00';

    const nextFin = horaFinInput()?.value.trim() || '23:59';



    if (nextInicio > nextFin) {

      void alertError('Horario invalido', 'La hora inicio debe ser menor o igual a la hora fin.');

      horaInicioInput().value = horaInicio;

      horaFinInput().value = horaFin;

      return;

    }



    horaInicio = nextInicio;

    horaFin = nextFin;

    void loadDetail();

  };



  horaInicioInput()?.addEventListener('change', onTimeFilterChange);

  horaFinInput()?.addEventListener('change', onTimeFilterChange);



  await loadDetail();



  return () => {

    horaInicioInput()?.removeEventListener('change', onTimeFilterChange);

    horaFinInput()?.removeEventListener('change', onTimeFilterChange);

    destroyMap(mapRef, layerRef);

  };

};

