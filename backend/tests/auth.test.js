const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-for-auth-tests';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// ── Mock de Prisma ─────────────────────────────────────────────
const mockPrisma = {
  usuario: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

jest.mock('../src/config/db', () => mockPrisma);

const app = require('../src/app');

// ── Helpers ────────────────────────────────────────────────────
const USUARIO_ACTIVO = {
  id: 'user-1',
  nombre: 'Carla',
  email: 'carla@pukupuku.pe',
  passwordHash: bcrypt.hashSync('correcta', 4),
  rol: 'COLABORADOR',
  activo: true,
};

const USUARIO_INACTIVO = { ...USUARIO_ACTIVO, id: 'user-2', activo: false };

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve 200 + cookies + usuario si credenciales son válidas', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(USUARIO_ACTIVO);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carla@pukupuku.pe', password: 'correcta' });

    expect(res.status).toBe(200);
    expect(res.body.usuario).toBeDefined();
    expect(res.body.usuario.nombre).toBe('Carla');

    // Verifica que las cookies httpOnly se enviaron
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith('token='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
  });

  it('rechaza con 401 si el email no existe', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@pukupuku.pe', password: 'x' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/credenciales/i);
  });

  it('rechaza con 401 si el usuario está inactivo', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(USUARIO_INACTIVO);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carla@pukupuku.pe', password: 'correcta' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/credenciales/i);
  });

  it('rechaza con 401 si la contraseña es incorrecta', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(USUARIO_ACTIVO);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carla@pukupuku.pe', password: 'incorrecta' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/credenciales/i);
  });

  it('rechaza con 400 si falta email o password (Zod)', async () => {
    const res1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carla@pukupuku.pe' });

    expect(res1.status).toBe(400);

    const res2 = await request(app)
      .post('/api/auth/login')
      .send({ password: 'x' });

    expect(res2.status).toBe(400);

    const res3 = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res3.status).toBe(400);
  });

  it('rechaza con 400 si el email no es válido (Zod)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no-es-un-email', password: 'x' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve 401 si no hay refreshToken cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('devuelve 200 + nuevo token si refreshToken es válido', async () => {
    const refreshToken = jwt.sign(
      { id: 'user-1', type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    mockPrisma.usuario.findUnique.mockResolvedValue(USUARIO_ACTIVO);

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${refreshToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.usuario.nombre).toBe('Carla');

    // Debe setear un nuevo token cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies.some((c) => c.startsWith('token='))).toBe(true);
  });
});

describe('POST /api/auth/logout', () => {
  it('limpia las cookies', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const cookies = res.headers['set-cookie'];
    // Debe limpiar ambas cookies (max-age <= 0)
    expect(cookies.some((c) => c.startsWith('token=;'))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refreshToken=;'))).toBe(true);
  });
});

describe('GET /api/auth/me (autenticación vía cookie)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve 401 si no hay token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('devuelve 401 si el token es inválido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['token=token-invalido']);

    expect(res.status).toBe(401);
  });
});
