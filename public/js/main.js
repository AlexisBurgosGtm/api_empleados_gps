import { initAuth } from './core/auth.js';
import { registerServiceWorker } from './core/pwa.js';
import { registerRoutes, startRouter, navigate } from './core/router.js';
import { mount as mountLogin } from './views/login.js';
import { mount as mountMapa } from './views/mapa.js';
import { mount as mountEmpleado } from './views/empleado.js';
import { mount as mountEmpresas } from './views/empresas.js';
import { mount as mountEmpleadosAdmin } from './views/empleadosAdmin.js';

const app = document.getElementById('app');

initAuth();

registerRoutes([
  ['/login', mountLogin, { guest: true }],
  ['/mapa', mountMapa, { auth: true }],
  ['/empleado/:codigo', mountEmpleado, { auth: true }],
  ['/empresas', mountEmpresas, { auth: true, root: true }],
  ['/empleados', mountEmpleadosAdmin, { auth: true, root: true }],
]);

startRouter(app, {
  onUnauthorized: () => navigate('/login', { replace: true }),
});

registerServiceWorker();
