const express = require('express');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../db');

const router = express.Router();

router.post('/login', async (req, res) => {
  const empnit = String(req.body?.empnit ?? '').trim();
  const clave = String(req.body?.clave ?? '').trim();

  if (!empnit || !clave) {
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET no configurado');
    return res.status(500).json({ message: 'Servidor no configurado correctamente' });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .input('clave', sql.VarChar(250), clave)
      .query(`
        SELECT EMPNIT, EMPRESA, TIPO
        FROM EMPRESAS
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
          AND RTRIM(LTRIM(CLAVE)) = @clave
          AND RTRIM(LTRIM(HABILITADO)) = 'SI'
      `);

    const empresa = result.recordset[0];

    if (!empresa) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      {
        empnit: empresa.EMPNIT.trim(),
        empresa: empresa.EMPRESA.trim(),
        tipo: String(empresa.TIPO ?? 'CLIENTE').trim().toUpperCase(),
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' },
    );

    return res.json({
      token,
      empnit: empresa.EMPNIT,
      empresa: empresa.EMPRESA,
      tipo: String(empresa.TIPO ?? 'CLIENTE').trim().toUpperCase(),
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error al iniciar sesión' });
  }
});

module.exports = router;
