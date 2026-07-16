const jwt = require('jsonwebtoken');

/**
 * Verifica el token JWT desde la cookie httpOnly 'token'.
 * Fallback: header Authorization: Bearer <token> (para testing y scripts).
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.token || (() => {
    const header = req.headers.authorization || '';
    const parts = header.split(' ');
    return parts[0] === 'Bearer' ? parts[1] : null;
  })();

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso no proporcionado.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.id, nombre: payload.nombre, rol: payload.rol };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

module.exports = { requireAuth };
