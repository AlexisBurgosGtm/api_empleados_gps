import { confirmDialog, toast, alertError, alertWarning } from './toast.js';

const STORAGE_KEY = 'gps_empleados_session';

let session = null;
const listeners = new Set();

const decodeTokenPayload = (token) => {
  try {
    const encoded = token.split('.')[1];
    if (!encoded) {
      return null;
    }

    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
};

export const normalizeSession = (data) => {
  if (!data?.token) {
    return null;
  }

  const payload = decodeTokenPayload(data.token);
  const tipo = String(data.tipo ?? payload?.tipo ?? 'CLIENTE')
    .trim()
    .toUpperCase();

  return {
    ...data,
    empnit: data.empnit ?? payload?.empnit ?? '',
    empresa: data.empresa ?? payload?.empresa ?? '',
    tipo: tipo === 'ROOT' ? 'ROOT' : 'CLIENTE',
  };
};

export const getSession = () => session;

export const isAuthenticated = () => Boolean(session?.token);

export const isRoot = () => session?.tipo === 'ROOT';

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const notify = () => {
  listeners.forEach((listener) => listener(session));
};

const removeStoredSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

/** Cada recarga (F5) inicia sin sesion: solo memoria durante la navegacion SPA. */
export const initAuth = () => {
  removeStoredSession();
  session = null;
  return session;
};

export const saveSession = (data) => {
  const normalized = normalizeSession(data);

  if (!normalized?.token) {
    throw new Error('Sesion invalida');
  }

  if (isTokenExpired(normalized.token)) {
    throw new Error('Sesion expirada');
  }

  session = normalized;
  notify();
  return session;
};

export const clearSession = () => {
  session = null;
  removeStoredSession();
  notify();
};

export const authHeaders = () => {
  if (!session?.token) {
    return { 'Content-Type': 'application/json' };
  }
  return {
    Authorization: `Bearer ${session.token}`,
    'Content-Type': 'application/json',
  };
};

export const login = async (empnit, clave) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empnit, clave }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Usuario o contraseña incorrectos');
    }
    throw new Error(payload.message || 'No se pudo iniciar sesión');
  }

  return saveSession(payload);
};

export const logout = async () => {
  const result = await confirmDialog({
    title: '¿Cerrar sesión?',
    icon: 'question',
    confirmText: 'Salir',
  });

  if (!result) {
    return false;
  }

  clearSession();
  return true;
};

export const handleUnauthorized = async () => {
  clearSession();
  await alertWarning('Sesión expirada', 'Inicie sesión nuevamente.');
};

export { alertError, alertWarning, toast, confirmDialog };
