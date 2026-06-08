const express = require('express');
const { sql, getPool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const parseFechaQuery = (value) => {
  const fecha = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return null;
  }

  return fecha;
};

const parseHoraQuery = (value, fallback) => {
  const hora = String(value ?? fallback ?? '').trim();
  if (!/^\d{2}:\d{2}$/.test(hora)) {
    return fallback ?? null;
  }

  return hora;
};

router.get('/', authMiddleware, async (req, res) => {
  const empnit = req.user.empnit;
  const fecha = parseFechaQuery(req.query.fecha);

  if (!fecha) {
    return res.status(400).json({ message: 'Fecha invalida o requerida' });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .input('fecha', sql.Date, fecha)
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
              ORDER BY HORA DESC
            ) AS rn
          FROM data_tracking
          WHERE EMPNIT = @empnit
            AND FECHA = @fecha
            AND LATITUD IS NOT NULL
            AND LONGITUD IS NOT NULL
            AND LATITUD <> 0
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
      fecha,
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

router.get('/:codigo', authMiddleware, async (req, res) => {
  const empnit = req.user.empnit;
  const codigo = String(req.params.codigo ?? '').trim();
  const fecha = parseFechaQuery(req.query.fecha);
  const horaInicio = parseHoraQuery(req.query.horaInicio, '00:00');
  const horaFin = parseHoraQuery(req.query.horaFin, '23:59');

  if (!codigo) {
    return res.status(400).json({ message: 'Codigo de empleado requerido' });
  }

  if (!fecha) {
    return res.status(400).json({ message: 'Fecha invalida o requerida' });
  }

  if (!horaInicio || !horaFin) {
    return res.status(400).json({ message: 'Horario invalido' });
  }

  if (horaInicio > horaFin) {
    return res.status(400).json({ message: 'Hora inicio debe ser menor o igual a hora fin' });
  }

  try {
    const pool = await getPool();

    const empleadoResult = await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .input('codigo', sql.VarChar(50), codigo)
      .query(`
        SELECT CODIGO, EMPLEADO
        FROM EMPLEADOS
        WHERE EMPNIT = @empnit
          AND CODIGO = @codigo
          AND RTRIM(LTRIM(HABILITADO)) = 'SI'
      `);

    const empleado = empleadoResult.recordset[0];

    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    const registrosResult = await pool
      .request()
      .input('codigo', sql.VarChar(50), codigo)
      .input('fecha', sql.Date, fecha)
      .input('horaInicio', sql.VarChar(5), horaInicio)
      .input('horaFin', sql.VarChar(5), horaFin)
      .query(`
        SELECT ID, HORA, LATITUD, LONGITUD
        FROM EMPLEADOS_GPS
        WHERE CODIGO = @codigo
          AND FECHA = @fecha
          AND HORA >= @horaInicio
          AND HORA <= @horaFin
        ORDER BY ID
      `);

    const conUbicacion = [];
    const sinUbicacion = [];

    for (const row of registrosResult.recordset) {
      const latitud = Number(row.LATITUD);
      const item = {
        id: row.ID,
        hora: formatTime(row.HORA),
      };

      if (latitud === 0) {
        sinUbicacion.push(item);
        continue;
      }

      if (Number.isFinite(latitud) && Number.isFinite(Number(row.LONGITUD))) {
        conUbicacion.push({
          ...item,
          latitud,
          longitud: Number(row.LONGITUD),
        });
      }
    }

    return res.json({
      codigo: empleado.CODIGO,
      empleado: empleado.EMPLEADO,
      fecha,
      horaInicio,
      horaFin,
      conUbicacion,
      sinUbicacion,
    });
  } catch (error) {
    console.error('Error en historial:', error);
    return res.status(500).json({ message: 'Error al obtener historial del empleado' });
  }
});

module.exports = router;
