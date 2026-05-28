import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import sql from 'mssql';

const app = express();
const port = Number(process.env.PORT ?? 7000);

const dbConfig = {
  server: process.env.DB_SERVER ?? 'sql8002.site4now.net',
  user: process.env.DB_USER ?? 'db_a6478c_gpsempleados_admin',
  password: process.env.DB_PASSWORD ?? 'razors1805',
  database: process.env.DB_NAME ?? 'db_a6478c_gpsempleados',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise;

const getPool = async () => {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig);
  }

  return poolPromise;
};

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/gps', async (req, res) => {
  const { codigo, fecha, hora, latitud, longitud } = req.body ?? {};

  console.log("nuevo registro", { codigo, fecha, hora, latitud, longitud });

  if (!codigo || !fecha || !hora || latitud === undefined || longitud === undefined) {
    return res.status(400).json({
      message: 'Faltan datos: codigo, fecha, hora, latitud, longitud',
    });
  }

  try {
    const pool = await getPool();

    await pool
      .request()
      .input('codigo', sql.VarChar(50), String(codigo))
      .input('fecha', sql.Date, String(fecha))
      .input('hora', sql.VarChar(5), String(hora))
      .input('latitud', sql.Float, Number(latitud))
      .input('longitud', sql.Float, Number(longitud))
      .query(`
        INSERT INTO EMPLEADOS_GPS (CODIGO, FECHA, HORA, LATITUD, LONGITUD)
        VALUES (@codigo, @fecha, @hora, @latitud, @longitud)
      `);

    return res.status(201).json({ message: 'Registro insertado correctamente' });
  } catch (error) {
    console.error('Database insert error:', error);

    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Error al insertar en SQL Server',
    });
  }
});

app.listen(port, () => {
  console.log(`GPS API listening on port ${port}`);
});
