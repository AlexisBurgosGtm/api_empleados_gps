const RootView = (() => {
  const sidebar = document.getElementById('root-sidebar');
  const navButtons = Array.from(document.querySelectorAll('.root-nav-btn'));
  const panels = {
    mapa: document.getElementById('view-dashboard'),
    empresas: document.getElementById('view-empresas'),
  };
  const employeePanel = document.getElementById('view-employee');
  const rootLogoutBtn = document.getElementById('root-logout-btn');

  const setRootMode = (enabled) => {
    document.body.classList.toggle('root-mode', enabled);
    sidebar.classList.toggle('hidden', !enabled);
    document.querySelectorAll('.client-logout-btn').forEach((button) => {
      button.classList.toggle('hidden', enabled);
    });
  };

  const showPanel = (name) => {
    Object.values(panels).forEach((panel) => panel?.classList.remove('active'));
    employeePanel?.classList.remove('active');

    if (name === 'employee') {
      employeePanel?.classList.add('active');
      return;
    }

    panels[name]?.classList.add('active');

    navButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.panel === name);
    });

    if (name === 'empresas' && window.EmpresasView) {
      window.EmpresasView.load();
    }

    if (name === 'mapa' && window.AppShell?.invalidateMap) {
      setTimeout(() => window.AppShell.invalidateMap(), 100);
    }
  };

  const init = ({ onLogout }) => {
    navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        showPanel(button.dataset.panel);
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
