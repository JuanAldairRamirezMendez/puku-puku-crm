const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/api',
};

function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function firmarRefresh(usuario) {
  return jwt.sign(
    { id: usuario.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Setea httpOnly cookies (token + refreshToken).
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const payload = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
    const token = firmarToken(payload);
    const refreshToken = firmarRefresh(payload);

    res.cookie('token', token, { ...COOKIE_OPTS, maxAge: 8 * 60 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth' });

    return res.json({ usuario: payload });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Refresca el access token usando el refreshToken httpOnly cookie.
 */
async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token no disponible.' });
    }

    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const payload = jwt.verify(refreshToken, secret);
    if (payload.type !== 'refresh') {
      return res.status(401).json({ error: 'Refresh token inválido.' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: payload.id } });
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo.' });
    }

    const tokenPayload = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
    const newToken = firmarToken(tokenPayload);

    res.cookie('token', newToken, { ...COOKIE_OPTS, maxAge: 8 * 60 * 60 * 1000 });

    return res.json({ usuario: tokenPayload });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token inválido o expirado.' });
    }
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Limpia las cookies.
 */
async function logout(req, res) {
  res.clearCookie('token', { ...COOKIE_OPTS, path: '/api' });
  res.clearCookie('refreshToken', { ...COOKIE_OPTS, path: '/api/auth' });
  return res.json({ ok: true });
}

/**
 * POST /api/auth/registrar  (solo ADMINISTRADOR)
 */
async function registrar(req, res, next) {
  try {
    const { nombre, email, password, rol } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = await prisma.usuario.create({
      data: { nombre, email, passwordHash, rol: rol || 'COLABORADOR' },
    });

    return res.status(201).json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 */
async function me(req, res) {
  return res.json({
    usuario: { id: req.usuario.id, nombre: req.usuario.nombre, rol: req.usuario.rol },
  });
}

module.exports = { login, registrar, me, refresh, logout };
