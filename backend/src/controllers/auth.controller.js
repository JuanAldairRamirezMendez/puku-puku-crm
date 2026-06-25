const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Login del personal de Puku Puku. Emite un JWT que el frontend
 * guarda en memoria (NUNCA en localStorage para evitar XSS en producción).
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son requeridos.' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/registrar  (solo ADMINISTRADOR)
 * Crea una cuenta de colaborador. La 2FA real (TOTP) se deja como
 * extensión futura — el campo twoFactorEnabled ya existe en el modelo.
 */
async function registrar(req, res, next) {
  try {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'nombre, email y password son requeridos.' });
    }

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

module.exports = { login, registrar };
