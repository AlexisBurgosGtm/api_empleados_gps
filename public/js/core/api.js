import { authHeaders, handleUnauthorized } from './auth.js';
import { parseJsonResponse } from './utils.js';
import { navigate } from './router.js';

export const apiFetch = async (path, options = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...authHeaders(),
      ...options.headers,
    },
  });

  const payload = await parseJsonResponse(response);

  if (response.status === 401) {
    await handleUnauthorized();
    await navigate('/login', { replace: true });
    throw new Error('Sesión expirada');
  }

  if (!response.ok) {
    const error = new Error(payload.message || 'Error en la solicitud');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const apiGet = (path) => apiFetch(path);

export const apiPost = (path, body) =>
  apiFetch(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPut = (path, body) =>
  apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });

export const apiPatch = (path) => apiFetch(path, { method: 'PATCH' });

export const apiDelete = (path) => apiFetch(path, { method: 'DELETE' });
