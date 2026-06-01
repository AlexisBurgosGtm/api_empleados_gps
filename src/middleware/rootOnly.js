const rootOnly = (req, res, next) => {
  if (req.user?.tipo !== 'ROOT') {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  next();
};

module.exports = { rootOnly };
