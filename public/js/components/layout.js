import { escapeHtml } from '../core/utils.js';
import { isRoot } from '../core/auth.js';

export const renderNavbar = (active) => {
  if (!isRoot()) {
    return '';
  }

  const items = [
    { id: 'mapa', label: 'MAPA', icon: 'fa-map', href: '/mapa' },
    { id: 'empresas', label: 'EMPRESAS', icon: 'fa-building', href: '/empresas' },
    { id: 'empleados', label: 'EMPLEADOS', icon: 'fa-users', href: '/empleados' },
  ];

  return `
    <nav class="app-navbar navbar navbar-expand-lg navbar-dark">
      <div class="container-fluid">
        <span class="navbar-brand mb-0">
          <i class="fa-solid fa-location-dot me-2"></i>SALES TRACK
        </span>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#appNavCollapse"
          aria-controls="appNavCollapse"
          aria-expanded="false"
          aria-label="Alternar navegacion"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="appNavCollapse">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            ${items
              .map(
                (item) => `
                  <li class="nav-item">
                    <a
                      class="nav-link app-nav-link ${active === item.id ? 'active' : ''}"
                      href="${item.href}"
                      data-nav
                    >
                      <i class="fa-solid ${item.icon} me-2"></i>${item.label}
                    </a>
                  </li>
                `,
              )
              .join('')}
          </ul>
          <button type="button" class="btn btn-outline-light btn-sm" id="nav-logout-btn">
            <i class="fa-solid fa-right-from-bracket me-1"></i>Salir
          </button>
        </div>
      </div>
    </nav>
  `;
};

export const renderPageHeader = ({ badge, title, actions = '' }) => `
  <header class="page-header">
    <div class="page-header-left">
      ${badge ? `<span class="header-badge">${escapeHtml(badge)}</span>` : ''}
      <h2 class="page-title">${escapeHtml(title)}</h2>
    </div>
    <div class="page-header-actions">${actions}</div>
  </header>
`;

export const renderAppPage = ({ nav, header, body, className = '' }) => `
  <div class="app-page ${className}">
    ${renderNavbar(nav)}
    <div class="app-page-body">
      ${header}
      <main class="page-main">${body}</main>
    </div>
  </div>
`;

export const bindLogout = (root, handler) => {
  root.querySelector('#nav-logout-btn')?.addEventListener('click', () => void handler());
  root.querySelector('#client-logout-btn')?.addEventListener('click', () => void handler());
};

export const clientLogoutButton = () =>
  !isRoot()
    ? `<button type="button" class="btn btn-light btn-sm" id="client-logout-btn">Salir</button>`
    : '';
