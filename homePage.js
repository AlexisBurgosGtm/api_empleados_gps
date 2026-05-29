const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatCell = (value) => {
  if (value === null || value === undefined) {
    return '--';
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('es-ES');
  }

  return escapeHtml(value);
};

export const renderHomePage = (rows, errorMessage) => {
  const tableRows = rows.length
    ? rows
        .map(
          (row) => `
        <tr>
          <td>${formatCell(row.CODIGO)}</td>
          <td>${formatCell(row.FECHA)}</td>
          <td>${formatCell(row.HORA)}</td>
          <td>${formatCell(row.LATITUD)}</td>
          <td>${formatCell(row.LONGITUD)}</td>
        </tr>
      `,
        )
        .join('')
    : `<tr><td colspan="5" class="empty">No hay registros para mostrar</td></tr>`;

  const errorBlock = errorMessage
    ? `<div class="error">${escapeHtml(errorMessage)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GPS Empleados - Registros</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 24px;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    h1 { margin: 0 0 8px; font-size: 2rem; color: #f8fafc; }
    .subtitle { color: #94a3b8; margin-bottom: 20px; }
    .meta {
      display: inline-block;
      background: #1e293b;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 0.95rem;
    }
    .error {
      background: #7f1d1d;
      color: #fecaca;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .table-wrap {
      overflow-x: auto;
      border-radius: 12px;
      border: 1px solid #334155;
      background: #1e293b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 720px;
    }
    th, td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid #334155;
    }
    th {
      background: #172554;
      color: #bfdbfe;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    tr:hover td { background: #0f172a; }
    .empty { text-align: center; color: #94a3b8; }
    .footer {
      margin-top: 16px;
      color: #64748b;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>GPS Empleados</h1>
    <p class="subtitle">Ultimos 100 registros de ubicacion (mas recientes primero)</p>
    <div class="meta">Tabla: <strong>EMPLEADOS_GPS</strong></div>
    ${errorBlock}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>CODIGO</th>
            <th>FECHA</th>
            <th>HORA</th>
            <th>LATITUD</th>
            <th>LONGITUD</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
    <p class="footer">Actualiza la pagina para ver nuevos registros.</p>
  </div>
</body>
</html>`;
};
