const express = require('express');
const { sql, getPool } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { rootOnly } = require('../middleware/rootOnly');

const router = express.Router();

const TIPOS_EMPLEADO = ['VENDEDOR', 'TECNICO', 'SUPERVISOR', 'REPARTIDOR', 'PILOTO'];

const normalizeHabilitado = (value) =>
  String(value ?? 'SI').trim().toUpperCase() === 'NO' ? 'NO' : 'SI';

const normalizeTipo = (value) => {
  const tipo = String(value ?? '').trim().toUpperCase();
  return TIPOS_EMPLEADO.includes(tipo) ? tipo : '';
};

const mapEmpleado = (row) => ({
  empnit: String(row.EMPNIT ?? '').trim(),
  codigo: String(row.CODIGO ?? '').trim(),
  empleado: String(row.EMPLEADO ?? '').trim(),
  tipo: normalizeTipo(row.TIPO),
  telefono: String(row.TELEFONO ?? '').trim(),
  habilitado: normalizeHabilitado(row.HABILITADO),
});

router.get('/verify/:empnit/:codigo', async (req, res) => {
  const empnit = String(req.params.empnit ?? '').trim();
  const codigo = String(req.params.codigo ?? '').trim();

  if (!empnit || !codigo) {
    return res.status(400).json({
      message: 'Empresa y codigo requeridos',
      activo: false,
    });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .input('codigo', sql.VarChar(250), codigo)
      .query(`
        SELECT EMPLEADO, HABILITADO
        FROM EMPLEADOS
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
          AND RTRIM(LTRIM(CODIGO)) = @codigo
      `);

    const empleado = result.recordset[0];

    if (!empleado) {
      return res.status(404).json({
        message: 'Empleado no encontrado',
        activo: false,
        empnit,
        codigo,
      });
    }

    const activo = normalizeHabilitado(empleado.HABILITADO) === 'SI';

    return res.json({
      empnit,
      codigo,
      empleado: empleado.EMPLEADO,
      activo,
      message: activo ? 'Empleado habilitado' : 'Empleado no habilitado',
    });
  } catch (error) {
    console.error('Error verificando empleado:', error);
    return res.status(500).json({ message: 'Error al verificar empleado', activo: false });
  }
});

router.get('/', authMiddleware, rootOnly, async (req, res) => {
  const empnit = String(req.query.empnit ?? '').trim();

  if (!empnit) {
    return res.status(400).json({ message: 'EMPNIT de empresa requerido' });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .query(`
        SELECT EMPNIT, CODIGO, EMPLEADO, TIPO, TELEFONO, HABILITADO
        FROM EMPLEADOS
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
        ORDER BY EMPLEADO
      `);

    return res.json({
      empnit,
      empleados: result.recordset.map(mapEmpleado),
    });
  } catch (error) {
    console.error('Error listando empleados:', error);
    return res.status(500).json({ message: 'Error al obtener empleados' });
  }
});

router.post('/', authMiddleware, rootOnly, async (req, res) => {
  const empnit = String(req.body?.empnit ?? '').trim();
  const codigo = String(req.body?.codigo ?? '').trim();
  const empleado = String(req.body?.empleado ?? '').trim();
  const tipo = normalizeTipo(req.body?.tipo);
  const telefono = String(req.body?.telefono ?? '').trim();
  const habilitado = normalizeHabilitado(req.body?.habilitado);

  if (!empnit || !codigo || !empleado || !tipo) {
    return res.status(400).json({ message: 'Empresa, CODIGO, EMPLEADO y TIPO son requeridos' });
  }

  try {
    const pool = await getPool();

    const empresa = await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .query(`
        SELECT EMPNIT
        FROM EMPRESAS
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
      `);

    if (!empresa.recordset[0]) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .input('codigo', sql.VarChar(250), codigo)
      .input('empleado', sql.VarChar(250), empleado)
      .input('tipo', sql.VarChar(150), tipo)
      .input('telefono', sql.VarChar(50), telefono)
      .input('habilitado', sql.VarChar(2), habilitado)
      .query(`
        INSERT INTO EMPLEADOS (EMPNIT, CODIGO, EMPLEADO, TIPO, TELEFONO, HABILITADO)
        VALUES (@empnit, @codigo, @empleado, @tipo, @telefono, @habilitado)
      `);

    return res.status(201).json({ message: 'Empleado creado' });
  } catch (error) {
    console.error('Error creando empleado:', error);
    const message =
      error?.number === 2627 || error?.number === 2601
        ? 'Ya existe un empleado con ese CODIGO en la empresa'
        : 'Error al crear empleado';
    return res.status(500).json({ message });
  }
});

router.put('/:empnit/:codigo', authMiddleware, rootOnly, async (req, res) => {
  const empnit = String(req.params.empnit ?? '').trim();
  const codigo = String(req.params.codigo ?? '').trim();
  const empleado = String(req.body?.empleado ?? '').trim();
  const tipo = normalizeTipo(req.body?.tipo);
  const telefono = String(req.body?.telefono ?? '').trim();
  const hasHabilitado = req.body?.habilitado !== undefined && req.body?.habilitado !== null;
  const habilitado = normalizeHabilitado(req.body?.habilitado);

  if (!empnit || !codigo || !empleado || !tipo) {
    return res.status(400).json({ message: 'Empresa, CODIGO, EMPLEADO y TIPO son requeridos' });
  }

  try {
    const pool = await getPool();
    const request = pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .input('codigo', sql.VarChar(250), codigo)
      .input('empleado', sql.VarChar(250), empleado)
      .input('tipo', sql.VarChar(150), tipo)
      .input('telefono', sql.VarChar(50), telefono);

    const updateQuery = hasHabilitado
      ? `
        UPDATE EMPLEADOS
        SET EMPLEADO = @empleado,
            TIPO = @tipo,
            TELEFONO = @telefono,
            HABILITADO = @habilitado
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
          AND RTRIM(LTRIM(CODIGO)) = @codigo
      `
      : `
        UPDATE EMPLEADOS
        SET EMPLEADO = @empleado,
            TIPO = @tipo,
            TELEFONO = @telefono
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
          AND RTRIM(LTRIM(CODIGO)) = @codigo
      `;

    if (hasHabilitado) {
      request.input('habilitado', sql.VarChar(2), habilitado);
    }

    const result = await request.query(updateQuery);

    if (!result.rowsAffected[0]) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    return res.json({ message: 'Empleado actualizado' });
  } catch (error) {
    console.error('Error actualizando empleado:', error);
    return res.status(500).json({ message: 'Error al actualizar empleado' });
  }
});

router.patch('/:empnit/:codigo/habilitado', authMiddleware, rootOnly, async (req, res) => {
  const empnit = String(req.params.empnit ?? '').trim();
  const codigo = String(req.params.codigo ?? '').trim();

  try {
    const pool = await getPool();
    const current = await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .input('codigo', sql.VarChar(250), codigo)
      .query(`
        SELECT HABILITADO
        FROM EMPLEADOS
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
          AND RTRIM(LTRIM(CODIGO)) = @codigo
      `);

    const row = current.recordset[0];

    if (!row) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    const nextValue = normalizeHabilitado(row.HABILITADO) === 'SI' ? 'NO' : 'SI';

    await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .input('codigo', sql.VarChar(250), codigo)
      .input('habilitado', sql.VarChar(2), nextValue)
      .query(`
        UPDATE EMPLEADOS
        SET HABILITADO = @habilitado
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
          AND RTRIM(LTRIM(CODIGO)) = @codigo
      `);

    return res.json({ habilitado: nextValue });
  } catch (error) {
    console.error('Error alternando habilitado empleado:', error);
    return res.status(500).json({ message: 'Error al actualizar estado' });
  }
});

router.delete('/:empnit/:codigo', authMiddleware, rootOnly, async (req, res) => {
  const empnit = String(req.params.empnit ?? '').trim();
  const codigo = String(req.params.codigo ?? '').trim();

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .input('codigo', sql.VarChar(250), codigo)
      .query(`
        DELETE FROM EMPLEADOS
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
          AND RTRIM(LTRIM(CODIGO)) = @codigo
      `);

    if (!result.rowsAffected[0]) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    return res.json({ message: 'Empleado eliminado' });
  } catch (error) {
    console.error('Error eliminando empleado:', error);
    const message =
      error?.number === 547
        ? 'No se puede eliminar: el empleado tiene registros relacionados'
        : 'Error al eliminar empleado';
    return res.status(500).json({ message });
  }
});

module.exports = router;
