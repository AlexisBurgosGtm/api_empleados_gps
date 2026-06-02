import { isAuthenticated, isRoot } from './auth.js';

const routes = [];
let appRoot = null;
let currentCleanup = null;
let onUnauthorized = null;

const matchPath = (pattern, pathname) => {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params = {};

  for (let index = 0; index < patternParts.length; index += 1) {
    const part = patternParts[index];
    const value = pathParts[index];

    if (part.startsWith(':')) {
      params[part.slice(1)] = decodeURIComponent(value);
    } else if (part !== value) {
      return null;
    }
  }

  return params;
};

const resolveRoute = (pathname) => {
  for (const route of routes) {
    const params = matchPath(route.path, pathname);
    if (params !== null) {
      return { route, params };
    }
  }
  return null;
};

const runGuards = (route) => {
  if (route.guest && isAuthenticated()) {
    return '/mapa';
  }

  if (route.auth && !isAuthenticated()) {
    return '/login';
  }

  if (route.root && !isRoot()) {
    return '/mapa';
  }

  return null;
};

export const navigate = async (path, { replace = false } = {}) => {
  const url = new URL(path, window.location.origin);
  const pathname = url.pathname === '/' ? '/login' : url.pathname;
  const resolved = resolveRoute(pathname);

  if (!resolved) {
    await navigate(isAuthenticated() ? '/mapa' : '/login', { replace: true });
    return;
  }

  const redirect = runGuards(resolved.route);
  if (redirect) {
    await navigate(redirect, { replace: true });
    return;
  }

  if (currentCleanup) {
    await currentCleanup();
    currentCleanup = null;
  }

  appRoot.innerHTML = '';
  currentCleanup = await resolved.route.mount(appRoot, resolved.params);

  const state = { path: pathname };
  if (replace) {
    history.replaceState(state, '', pathname);
  } else if (window.location.pathname !== pathname) {
    history.pushState(state, '', pathname);
  }
};

export const startRouter = (root, options = {}) => {
  appRoot = root;
  onUnauthorized = options.onUnauthorized;

  window.addEventListener('popstate', () => {
    void navigate(window.location.pathname, { replace: true });
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-nav]');
    if (!link) {
      return;
    }

    event.preventDefault();
    void navigate(link.getAttribute('href') || link.dataset.nav);
  });

  const initialPath = window.location.pathname;

  if (!isAuthenticated()) {
    void navigate('/login', { replace: true });
    return;
  }

  const target =
    initialPath === '/' || initialPath === '' || initialPath === '/login'
      ? '/mapa'
      : initialPath;

  void navigate(target, { replace: true });
};

export const registerRoute = (path, mount, options = {}) => {
  routes.push({ path, mount, ...options });
};

export const registerRoutes = (entries) => {
  entries.forEach(([path, mount, options]) => registerRoute(path, mount, options));
};

export const getOnUnauthorized = () => onUnauthorized;
