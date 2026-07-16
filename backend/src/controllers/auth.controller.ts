import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api',
};

function firmarToken(usuario: { id: string; nombre: string; rol: string }) {
  return jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' } as jwt.SignOptions
  );
}

function firmarRefresh(usuario: { id: string }) {
  return jwt.sign(
    { id: usuario.id, type: 'refresh' },
    (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) as string,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
}

export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.activo) {
      res.status(401).json({ error: 'Credenciales inválidas.' });
      return;
    }

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValida) {
      res.status(401).json({ error: 'Credenciales inválidas.' });
      return;
    }

    const payload = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
    const token = firmarToken(payload);
    const refreshToken = firmarRefresh(payload);

    res.cookie('token', token, { ...COOKIE_OPTS, maxAge: 8 * 60 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth' });

    res.json({ usuario: payload });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token no disponible.' });
      return;
    }

    const secret = (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) as string;
    const payload = jwt.verify(refreshToken, secret) as { id: string; type: string };
    if (payload.type !== 'refresh') {
      res.status(401).json({ error: 'Refresh token inválido.' });
      return;
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: payload.id } });
    if (!usuario || !usuario.activo) {
      res.status(401).json({ error: 'Usuario no encontrado o inactivo.' });
      return;
    }

    const tokenPayload = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
    const newToken = firmarToken(tokenPayload);

    res.cookie('token', newToken, { ...COOKIE_OPTS, maxAge: 8 * 60 * 60 * 1000 });

    res.json({ usuario: tokenPayload });
  } catch (err) {
    if (err instanceof Error && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')) {
      res.status(401).json({ error: 'Refresh token inválido o expirado.' });
      return;
    }
    next(err);
  }
}

export async function logout(req: AuthRequest, res: Response) {
  res.clearCookie('token', { ...COOKIE_OPTS, path: '/api' });
  res.clearCookie('refreshToken', { ...COOKIE_OPTS, path: '/api/auth' });
  res.json({ ok: true });
}

export async function registrar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { nombre, email, password, rol } = req.body as { nombre: string; email: string; password: string; rol?: string };

    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = await prisma.usuario.create({
      data: { nombre, email, passwordHash, rol: (rol || 'COLABORADOR') as any },
    });

    res.status(201).json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthRequest, res: Response) {
  res.json({
    usuario: { id: req.usuario!.id, nombre: req.usuario!.nombre, rol: req.usuario!.rol },
  });
}
