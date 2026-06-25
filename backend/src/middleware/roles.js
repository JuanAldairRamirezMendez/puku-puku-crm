/**
 * Restringe el acceso a una ruta según el rol del usuario autenticado.
 * Uso: router.get('/reportes', requireAuth, requireRole('ADMINISTRADOR', 'GERENTE'), ctrl)
 * Cumple el requisito normativo de "control de acceso por roles" (Ley N.° 29733, APF2 §4.2.1).
 */
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: `Acceso restringido. Rol requerido: ${rolesPermitidos.join(' o ')}.`,
      });
    }
    next();
  };
}

module.exports = { requireRole };
