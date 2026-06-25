const jwt = require('jsonwebtoken');

/**
 * Verifica el token JWT enviado en el header Authorization: Bearer <token>.
 * Si es válido, adjunta el usuario decodificado en req.usuario.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token de acceso no proporcionado.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id, nombre, rol }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

module.exports = { requireAuth };
