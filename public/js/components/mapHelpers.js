import { escapeHtml } from '../core/utils.js';

export const createEmployeeIcon = (empleado, fecha, hora) =>
  L.divIcon({
    className: 'employee-marker',
    html: `
      <div class="employee-marker-wrap">
        <div class="employee-label">
          ${escapeHtml(empleado)}
          <small>${escapeHtml(fecha)} · ${escapeHtml(hora)}</small>
        </div>
        <div class="employee-pin">
          <i class="fa-solid fa-user-location" aria-hidden="true"></i>
        </div>
      </div>
    `,
    iconSize: [29, 29],
    iconAnchor: [15, 29],
  });

export const createRouteIcon = (hora) =>
  L.divIcon({
    className: 'route-marker',
    html: `
      <div class="route-marker-wrap">
        <div class="route-marker-label">${escapeHtml(hora)}</div>
        <div class="route-marker-pin"></div>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

export const createRoutePolyline = (latLngs) => {
  if (!latLngs || latLngs.length < 2) {
    return null;
  }

  return L.polyline(latLngs, {
    color: '#dc2626',
    weight: 4,
    opacity: 0.9,
    lineJoin: 'round',
    lineCap: 'round',
  });
};

export const bindRouteMarkerToggle = (marker, layerGroup, map) => {
  const closeAllRouteLabels = () => {
    layerGroup?.eachLayer((layer) => {
      layer.getElement?.()
        ?.querySelector('.route-marker-wrap')
        ?.classList.remove('is-open');
    });
  };

  marker.on('click', (event) => {
    L.DomEvent.stopPropagation(event);

    const wrap = marker.getElement()?.querySelector('.route-marker-wrap');
    if (!wrap) {
      return;
    }

    const wasOpen = wrap.classList.contains('is-open');
    closeAllRouteLabels();

    if (!wasOpen) {
      wrap.classList.add('is-open');
    }
  });

  if (map && !map._routeLabelCloseBound) {
    map.on('click', closeAllRouteLabels);
    map._routeLabelCloseBound = true;
  }

  return closeAllRouteLabels;
};

export const createMap = (elementId, layerRef) => {
  const map = L.map(elementId, {
    zoomControl: true,
    attributionControl: true,
  }).setView([14.6349, -90.5069], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map);

  layerRef.current = L.layerGroup().addTo(map);

  return map;
};

export const destroyMap = (mapRef, layerRef) => {
  if (mapRef.current) {
    mapRef.current.remove();
    mapRef.current = null;
  }
  layerRef.current = null;
};

export const fitMarkers = (map, bounds) => {
  if (!bounds.length) {
    return;
  }
  if (bounds.length === 1) {
    map.setView(bounds[0], 15);
  } else {
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
  }
  setTimeout(() => map.invalidateSize(), 100);
};
