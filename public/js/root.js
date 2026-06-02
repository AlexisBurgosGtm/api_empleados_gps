const RootView = (() => {
  const navbar = document.getElementById('root-navbar');
  const navCollapse = document.getElementById('rootNavCollapse');
  const navButtons = Array.from(document.querySelectorAll('.root-nav-btn'));
  const panels = {
    mapa: document.getElementById('view-dashboard'),
    empresas: document.getElementById('view-empresas'),
  };
  const employeePanel = document.getElementById('view-employee');
  const rootLogoutBtn = document.getElementById('root-logout-btn');

  const collapseNav = () => {
    if (!navCollapse?.classList.contains('show')) {
      return;
    }

    bootstrap.Collapse.getOrCreateInstance(navCollapse).hide();
  };

  const setRootMode = (enabled) => {
    document.body.classList.toggle('root-mode', enabled);
    navbar?.classList.toggle('hidden', !enabled);
    document.querySelectorAll('.client-logout-btn').forEach((button) => {
      button.classList.toggle('hidden', enabled);
    });
  };

  const showPanel = (name) => {
    Object.values(panels).forEach((panel) => panel?.classList.remove('active'));
    employeePanel?.classList.remove('active');

    if (name === 'employee') {
      employeePanel?.classList.add('active');
      setTimeout(() => window.AppShell?.invalidateMap(), 150);
      return;
    }

    panels[name]?.classList.add('active');

    navButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.panel === name);
    });

    if (name === 'empresas' && window.EmpresasView) {
      window.EmpresasView.load();
    }

    if (name === 'mapa') {
      setTimeout(() => window.AppShell?.invalidateMap(), 150);
    }
  };

  const init = ({ onLogout }) => {
    navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        showPanel(button.dataset.panel);
        collapseNav();
      });
    });

    rootLogoutBtn?.addEventListener('click', () => {
      onLogout?.();
    });
  };

  const enter = (tipo) => {
    const isRoot = tipo === 'ROOT';
    setRootMode(isRoot);
    showPanel('mapa');
  };

  return {
    init,
    enter,
    showPanel,
    setRootMode,
  };
})();

window.RootView = RootView;
