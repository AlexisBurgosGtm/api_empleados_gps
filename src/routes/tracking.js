const express = require('express');
const { sql, getPool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const empnit = req.user.empnit;

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('empnit', sql.VarChar, empnit)
      .query(`
        WITH ranked AS (
          SELECT
            CODIGO,
            EMPLEADO,
            FECHA,
            HORA,
            LATITUD,
            LONGITUD,
            ROW_NUMBER() OVER (
              PARTITION BY CODIGO
              ORDER BY FECHA DESC, HORA DESC
            ) AS rn
          FROM data_tracking
          WHERE EMPNIT = @empnit
            AND LATITUD IS NOT NULL
            AND LONGITUD IS NOT NULL
        )
        SELECT CODIGO, EMPLEADO, FECHA, HORA, LATITUD, LONGITUD
        FROM ranked
        WHERE rn = 1
        ORDER BY EMPLEADO
      `);

    const empleados = result.recordset.map((row) => ({
      codigo: row.CODIGO,
      empleado: row.EMPLEADO,
      fecha: formatDate(row.FECHA),
      hora: formatTime(row.HORA),
      latitud: Number(row.LATITUD),
      longitud: Number(row.LONGITUD),
    }));

    return res.json({
      empresa: req.user.empresa,
      empnit: req.user.empnit,
      empleados,
    });
  } catch (error) {
    console.error('Error en tracking:', error);
    return res.status(500).json({ message: 'Error al obtener ubicaciones' });
  }
});

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

module.exports = router;
