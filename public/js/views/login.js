import { login, alertError, alertWarning } from '../core/auth.js';
import { navigate } from '../core/router.js';

export const mount = async (root) => {
  root.innerHTML = `
    <section class="view-login">
      <div class="login-shell">
        <div class="login-card shadow-lg">
          <div class="login-brand">
            <div class="brand-icon">
              <i class="fa-solid fa-location-dot"></i>
            </div>
            <h1 class="login-title">SALES TRACK</h1>
            <p class="login-subtitle">Seguimiento en tiempo real</p>
          </div>

          <form id="login-form" class="login-form" novalidate>
            <div class="mb-3">
              <label for="empnit" class="form-label">Usuario (EMPNIT)</label>
              <input
                type="text"
                class="form-control form-control-lg"
                id="empnit"
                name="empnit"
                autocomplete="username"
                placeholder="Ingrese su EMPNIT"
                required
              />
            </div>
            <div class="mb-4">
              <label for="clave" class="form-label">Contraseña</label>
              <input
                type="password"
                class="form-control form-control-lg"
                id="clave"
                name="clave"
                autocomplete="current-password"
                placeholder="Ingrese su clave"
                required
              />
            </div>
            <button type="submit" class="btn btn-dark btn-lg w-100 login-btn" id="login-btn">
              Iniciar sesión
            </button>
          </form>
        </div>
      </div>
    </section>
  `;

  const form = root.querySelector('#login-form');
  const loginBtn = root.querySelector('#login-btn');

  const onSubmit = async (event) => {
    event.preventDefault();

    const empnit = form.empnit.value.trim();
    const clave = form.clave.value.trim();

    if (!empnit || !clave) {
      await alertWarning('Campos requeridos', 'Ingrese usuario y contraseña.');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Ingresando...';

    try {
      const session = await login(empnit, clave);
      form.reset();
      await navigate('/mapa', { replace: true });
    } catch (error) {
      await alertError('Acceso denegado', error.message);
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Iniciar sesión';
    }
  };

  form.addEventListener('submit', onSubmit);

  return () => {
    form.removeEventListener('submit', onSubmit);
  };
};
