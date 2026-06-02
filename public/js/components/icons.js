const SVG_ATTRS = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"';

export const iconPlus = (className = 'empresas-icon') =>
  `<svg class="${className}" ${SVG_ATTRS} fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>`;

export const iconEdit = (className = 'empresas-icon') =>
  `<svg class="${className}" ${SVG_ATTRS} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
  </svg>`;

export const iconTrash = (className = 'empresas-icon') =>
  `<svg class="${className}" ${SVG_ATTRS} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 6h18"/>
    <path d="M8 6V4h8v2"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    <path d="M10 11v6M14 11v6"/>
  </svg>`;
