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

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('empnit', sql.VarChar, empnit)
      .input('clave', sql.VarChar, clave)
      .query(`
        SELECT EMPNIT, EMPRESA
        FROM EMPRESAS
        WHERE EMPNIT = @empnit AND CLAVE = @clave
      `);

    const empresa = result.recordset[0];

    if (!empresa) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { empnit: empresa.EMPNIT, empresa: empresa.EMPRESA },
      process.env.JWT_SECRET,
      { expiresIn: '12h' },
    );

    return res.json({
      token,
      empnit: empresa.EMPNIT,
      empresa: empresa.EMPRESA,
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error al iniciar sesión' });
  }
});

module.exports = router;
