const { sql, getPool } = require('../db');

const rootOnly = async (req, res, next) => {
  const tipo = String(req.user?.tipo ?? '').trim().toUpperCase();

  if (tipo === 'ROOT') {
    return next();
  }

  const empnit = String(req.user?.empnit ?? '').trim();

  if (!empnit) {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('empnit', sql.VarChar(50), empnit)
      .query(`
        SELECT TIPO
        FROM EMPRESAS
        WHERE RTRIM(LTRIM(EMPNIT)) = @empnit
      `);

    const dbTipo = String(result.recordset[0]?.TIPO ?? '').trim().toUpperCase();

    if (dbTipo === 'ROOT') {
      req.user.tipo = 'ROOT';
      return next();
    }
  } catch (error) {
    console.error('Error verificando tipo ROOT:', error);
    return res.status(500).json({ message: 'Error al verificar permisos' });
  }

  return res.status(403).json({ message: 'Acceso denegado. Se requiere usuario ROOT' });
};

module.exports = { rootOnly };
