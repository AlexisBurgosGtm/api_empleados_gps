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
        <div class="employee-pin"></div>
      </div>
    `,
    iconSize: [180, 56],
    iconAnchor: [90, 56],
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
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

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
