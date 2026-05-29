const express = require('express');
const { sql, getPool } = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const codigo = String(req.body?.codigo ?? '').trim();
  const fecha = String(req.body?.fecha ?? '').trim();
  const hora = String(req.body?.hora ?? '').trim();
  const latitud = Number(req.body?.latitud);
  const longitud = Number(req.body?.longitud);

  if (!codigo || !fecha || !hora || Number.isNaN(latitud) || Number.isNaN(longitud)) {
    return res.status(400).json({ message: 'Datos incompletos o invalidos' });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input('codigo', sql.VarChar, codigo)
      .input('fecha', sql.VarChar, fecha)
      .input('hora', sql.VarChar, hora)
      .input('latitud', sql.Float, latitud)
      .input('longitud', sql.Float, longitud)
      .query(`
        INSERT INTO EMPLEADOS_GPS (CODIGO, FECHA, HORA, LATITUD, LONGITUD)
        VALUES (@codigo, @fecha, @hora, @latitud, @longitud)
      `);

    return res.json({ message: 'Datos enviados' });
  } catch (error) {
    console.error('Error en GPS:', error);
    return res.status(500).json({ message: 'Error al guardar ubicacion' });
  }
});

module.exports = router;
