const express = require('express');
const { sql, getPool } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { rootOnly } = require('../middleware/rootOnly');

const router = express.Router();

const normalizeTipo = (value) => {
  const tipo = String(value ?? 'CLIENTE').trim().toUpperCase();
  return tipo === 'ROOT' ? 'ROOT' : 'CLIENTE';
};

const normalizeHabilitado = (value) =>
  String(value ?? 'SI').trim().toUpperCase() === 'NO' ? 'NO' : 'SI';

router.get('/verify/:empnit', async (req, res) => {
  const empnit = String(req.params.empnit ?? '').trim();

  if (!empnit) {
    return res.status(400).json({ message: 'ID de empresa requerido', activo: false });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .query(`
        SELECT EMPNIT, EMPRESA, HABILITADO
        FROM EMPRESAS
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
      `);

    const empresa = result.recordset[0];

    if (!empresa) {
      return res.status(404).json({
        message: 'Empresa no encontrada',
        activo: false,
        empnit,
      });
    }

    const activo = String(empresa.HABILITADO ?? '').trim().toUpperCase() === 'SI';

    return res.json({
      empnit: empresa.EMPNIT,
      empresa: empresa.EMPRESA,
      activo,
      message: activo ? 'Empresa activa' : 'Empresa inactiva',
    });
  } catch (error) {
    console.error('Error verificando empresa:', error);
    return res.status(500).json({ message: 'Error al verificar empresa', activo: false });
  }
});

router.get('/', authMiddleware, rootOnly, async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT EMPNIT, EMPRESA, HABILITADO, CLAVE, TIPO
      FROM EMPRESAS
      ORDER BY EMPRESA
    `);

    const empresas = result.recordset.map((row) => ({
      empnit: row.EMPNIT,
      empresa: row.EMPRESA,
      habilitado: normalizeHabilitado(row.HABILITADO),
      clave: row.CLAVE,
      tipo: normalizeTipo(row.TIPO),
    }));

    return res.json({ empresas });
  } catch (error) {
    console.error('Error listando empresas:', error);
    return res.status(500).json({ message: 'Error al obtener empresas' });
  }
});

router.post('/', authMiddleware, rootOnly, async (req, res) => {
  const empnit = String(req.body?.empnit ?? '').trim();
  const empresa = String(req.body?.empresa ?? '').trim();
  const clave = String(req.body?.clave ?? '').trim();
  const tipo = normalizeTipo(req.body?.tipo);
  const habilitado = normalizeHabilitado(req.body?.habilitado);

  if (!empnit || !empresa || !clave) {
    return res.status(400).json({ message: 'EMPNIT, EMPRESA y CLAVE son requeridos' });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .input('empresa', sql.VarChar(350), empresa)
      .input('clave', sql.VarChar(250), clave)
      .input('tipo', sql.VarChar(50), tipo)
      .input('habilitado', sql.VarChar(2), habilitado)
      .query(`
        INSERT INTO EMPRESAS (EMPNIT, EMPRESA, CLAVE, TIPO, HABILITADO)
        VALUES (@empnit, @empresa, @clave, @tipo, @habilitado)
      `);

    return res.status(201).json({ message: 'Empresa creada' });
  } catch (error) {
    console.error('Error creando empresa:', error);
    return res.status(500).json({ message: 'Error al crear empresa' });
  }
});

router.put('/:empnit', authMiddleware, rootOnly, async (req, res) => {
  const empnit = String(req.params.empnit ?? '').trim();
  const empresa = String(req.body?.empresa ?? '').trim();
  const clave = String(req.body?.clave ?? '').trim();
  const tipo = normalizeTipo(req.body?.tipo);
  const habilitado = normalizeHabilitado(req.body?.habilitado);

  if (!empnit || !empresa || !clave) {
    return res.status(400).json({ message: 'EMPNIT, EMPRESA y CLAVE son requeridos' });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .input('empresa', sql.VarChar(350), empresa)
      .input('clave', sql.VarChar(250), clave)
      .input('tipo', sql.VarChar(50), tipo)
      .input('habilitado', sql.VarChar(2), habilitado)
      .query(`
        UPDATE EMPRESAS
        SET EMPRESA = @empresa,
            CLAVE = @clave,
            TIPO = @tipo,
            HABILITADO = @habilitado
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
      `);

    if (!result.rowsAffected[0]) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    return res.json({ message: 'Empresa actualizada' });
  } catch (error) {
    console.error('Error actualizando empresa:', error);
    return res.status(500).json({ message: 'Error al actualizar empresa' });
  }
});

router.patch('/:empnit/habilitado', authMiddleware, rootOnly, async (req, res) => {
  const empnit = String(req.params.empnit ?? '').trim();

  try {
    const pool = await getPool();
    const current = await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .query(`
        SELECT HABILITADO
        FROM EMPRESAS
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
      `);

    const row = current.recordset[0];

    if (!row) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    const nextValue = normalizeHabilitado(row.HABILITADO) === 'SI' ? 'NO' : 'SI';

    await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .input('habilitado', sql.VarChar(2), nextValue)
      .query(`
        UPDATE EMPRESAS
        SET HABILITADO = @habilitado
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
      `);

    return res.json({ habilitado: nextValue });
  } catch (error) {
    console.error('Error alternando habilitado:', error);
    return res.status(500).json({ message: 'Error al actualizar estado' });
  }
});

router.delete('/:empnit', authMiddleware, rootOnly, async (req, res) => {
  const empnit = String(req.params.empnit ?? '').trim();

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .query(`
        DELETE FROM EMPRESAS
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
      `);

    if (!result.rowsAffected[0]) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    return res.json({ message: 'Empresa eliminada' });
  } catch (error) {
    console.error('Error eliminando empresa:', error);
    return res.status(500).json({ message: 'Error al eliminar empresa' });
  }
});

module.exports = router;
