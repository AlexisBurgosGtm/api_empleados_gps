require('dotenv').config();

const express = require('express');
const path = require('path');

const authRoutes = require('./routes/auth');
const trackingRoutes = require('./routes/tracking');
const gpsRoutes = require('./routes/gps');
const empresasRoutes = require('./routes/empresas');
const { getPool } = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/empresas', empresasRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/admin/registros', async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 100 CODIGO, FECHA, HORA, LATITUD, LONGITUD
      FROM EMPLEADOS_GPS
      ORDER BY FECHA DESC, HORA DESC
    `);

    const rows = result.recordset
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.CODIGO)}</td>
            <td>${escapeHtml(formatDate(row.FECHA))}</td>
            <td>${escapeHtml(formatTime(row.HORA))}</td>
            <td>${row.LATITUD}</td>
            <td>${row.LONGITUD}</td>
          </tr>
        `,
      )
      .join('');

    res.send(buildRegistrosPage(rows));
  } catch (error) {
    console.error('Error en registros:', error);
    res.status(500).send(buildRegistrosPage('', 'No se pudieron cargar los registros'));
  }
});

app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatDate = (value) => {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('es-GT');
  }

  return String(value);
};

const formatTime = (value) => {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return value.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  }

  const text = String(value);
  return text.length >= 5 ? text.slice(0, 5) : text;
};

const buildRegistrosPage = (rows, errorMessage = '') => `
<!DOCTYPE html>
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
    a { color: #93c5fd; }
  </style>
</head>
<body>
  <div class="container">
    <h1>GPS Empleados</h1>
    <p class="subtitle">Ultimos 100 registros de ubicacion (mas recientes primero)</p>
    <div class="meta">Tabla: <strong>EMPLEADOS_GPS</strong> · <a href="/">Ir al mapa</a></div>
    ${errorMessage ? `<div class="error">${escapeHtml(errorMessage)}</div>` : ''}
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
          ${
            rows ||
            '<tr><td colspan="5" class="empty">Sin registros</td></tr>'
          }
        </tbody>
      </table>
    </div>
    <p class="footer">Actualiza la pagina para ver nuevos registros.</p>
  </div>
</body>
</html>
`;
