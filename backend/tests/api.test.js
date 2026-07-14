const request = require('supertest');

// ── Mock de Prisma ─────────────────────────────────────────────
const mockPrisma = {
  cliente: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  interaccion: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

jest.mock('../src/config/db', () => mockPrisma);

const app = require('../src/app');

// ── Helpers ────────────────────────────────────────────────────
const USUARIO_TOKEN = Buffer.from(
  JSON.stringify({ id: 'user-1', nombre: 'Test', rol: 'ADMINISTRADOR' })
).toString('base64');

// Simula el middleware requireAuth inyectando req.usuario
// Para esto, mockeamos jwt.verify en auth.js
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(() => ({
    id: 'user-1',
    nombre: 'Test Colaborador',
    rol: 'ADMINISTRADOR',
  })),
}));

// ────────────────────────────────────────────────────────────────
// Test 1: POST /api/clientes rechaza si consentimientoLey29733 !== true
// ────────────────────────────────────────────────────────────────
describe('POST /api/clientes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.cliente.findUnique.mockResolvedValue(null);
    mockPrisma.cliente.create.mockImplementation(async ({ data }) => ({
      id: 'cliente-1',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it('rechaza con 400 si consentimientoLey29733 no es true', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer token-falso`)
      .send({
        nombreCompleto: 'Ana Torres',
        telefono: '999888777',
        canalOrigen: 'WHATSAPP',
        consentimientoLey29733: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/consentimiento/i);
    expect(mockPrisma.cliente.create).not.toHaveBeenCalled();
  });

  it('rechaza con 400 si consentimientoLey29733 se omite', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer token-falso`)
      .send({
        nombreCompleto: 'Ana Torres',
        telefono: '999888777',
        canalOrigen: 'WHATSAPP',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/consentimiento/i);
  });

  it('rechaza con 409 si el telefono ya existe', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue({
      id: 'existente-1',
      nombreCompleto: 'Juan Pérez',
      telefono: '999888777',
    });

    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer token-falso`)
      .send({
        nombreCompleto: 'Ana Torres',
        telefono: '999888777',
        canalOrigen: 'WHATSAPP',
        consentimientoLey29733: true,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ya existe/i);
    expect(res.body.clienteExistente.nombre).toBe('Juan Pérez');
    expect(mockPrisma.cliente.create).not.toHaveBeenCalled();
  });

  it('crea cliente exitosamente con consentimiento true', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer token-falso`)
      .send({
        nombreCompleto: 'Ana Torres',
        telefono: '999888777',
        canalOrigen: 'WHATSAPP',
        productoFavorito: 'Flat White',
        consentimientoLey29733: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.nombreCompleto).toBe('Ana Torres');
    expect(res.body.consentimientoLey29733).toBe(true);
    expect(mockPrisma.cliente.create).toHaveBeenCalledTimes(1);
  });
});

// ────────────────────────────────────────────────────────────────
// Test 2: PATCH /api/interacciones/:id/cerrar actualiza productoFavorito
// ────────────────────────────────────────────────────────────────
describe('PATCH /api/interacciones/:id/cerrar', () => {
  const INTERACCION_PENDIENTE = {
    id: 'inter-1',
    clienteId: 'cliente-1',
    canal: 'WHATSAPP',
    estado: 'PENDIENTE',
    resumenPedido: 'Un café',
    montoSoles: null,
    actualizoPreferencia: false,
    colaboradorId: 'user-1',
    fecha: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.interaccion.findUnique.mockResolvedValue(INTERACCION_PENDIENTE);

    mockPrisma.interaccion.update.mockImplementation(async ({ id, data }) => ({
      ...INTERACCION_PENDIENTE,
      ...data,
      cerradaEn: data.cerradaEn || new Date(),
    }));

    mockPrisma.cliente.update.mockImplementation(async ({ where, data }) => ({
      id: 'cliente-1',
      nombreCompleto: 'Ana Torres',
      telefono: '999888777',
      productoFavorito: 'Flat White',
      ...data,
    }));
  });

  it('rechaza con 409 si la interaccion ya esta resuelta', async () => {
    mockPrisma.interaccion.findUnique.mockResolvedValue({
      ...INTERACCION_PENDIENTE,
      estado: 'RESUELTO',
    });

    const res = await request(app)
      .patch('/api/interacciones/inter-1/cerrar')
      .set('Authorization', `Bearer token-falso`)
      .send({ montoSoles: 15, satisfaccion: 'SATISFECHO' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ya fue cerrada/i);
    expect(mockPrisma.interaccion.update).not.toHaveBeenCalled();
  });

  it('actualiza productoFavorito del cliente cuando actualizoPreferencia=true', async () => {
    const res = await request(app)
      .patch('/api/interacciones/inter-1/cerrar')
      .set('Authorization', `Bearer token-falso`)
      .send({
        montoSoles: 18.5,
        actualizoPreferencia: true,
        productoFavoritoNuevo: 'Matcha Latte',
        satisfaccion: 'SATISFECHO',
      });

    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

    // Verifica que se actualizó la interacción
    const updateCall = mockPrisma.interaccion.update.mock.calls[0][0];
    expect(updateCall.data.estado).toBe('RESUELTO');
    expect(updateCall.data.montoSoles).toBe(18.5);

    // Verifica que se propagó el producto favorito al cliente
    expect(mockPrisma.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cliente-1' },
      data: { productoFavorito: 'Matcha Latte' },
    });
  });

  it('cierra sin actualizar productoFavorito si actualizoPreferencia=false', async () => {
    const res = await request(app)
      .patch('/api/interacciones/inter-1/cerrar')
      .set('Authorization', `Bearer token-falso`)
      .send({
        montoSoles: 15,
        actualizoPreferencia: false,
        satisfaccion: 'NEUTRO',
      });

    expect(res.status).toBe(200);
    expect(mockPrisma.cliente.update).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────
// Test 3: GET /api/reportes/export-apf3.csv devuelve las 6 columnas
// ────────────────────────────────────────────────────────────────
describe('GET /api/reportes/export-apf3.csv', () => {
  const CLIENTES = [
    {
      id: 'c1',
      nombreCompleto: 'Ana Torres',
      telefono: '999888111',
      canalOrigen: 'WHATSAPP',
      productoFavorito: 'Flat White',
      consentimientoLey29733: true,
      interacciones: [
        { id: 'i1', montoSoles: 15, fecha: new Date() },
        { id: 'i2', montoSoles: 20, fecha: new Date(Date.now() - 86400000 * 5) },
      ],
    },
    {
      id: 'c2',
      nombreCompleto: 'Carlos Ruiz',
      telefono: '999888222',
      canalOrigen: 'PRESENCIAL',
      productoFavorito: null,
      consentimientoLey29733: true,
      interacciones: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.cliente.findMany.mockResolvedValue(CLIENTES);
  });

  it('devuelve CSV con las 8 columnas exactas del header', async () => {
    const res = await request(app)
      .get('/api/reportes/export-apf3.csv')
      .set('Authorization', `Bearer token-falso`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);

    const lines = res.text.trim().split('\n');
    const header = lines[0];

    expect(header).toBe(
      'nombre,frecuencia_visita,ticket_promedio_soles,gasto_total_mensual_estimado,canal_origen,producto_favorito,churn_label,churn_score'
    );
  });

  it('contiene datos de todos los clientes', async () => {
    const res = await request(app)
      .get('/api/reportes/export-apf3.csv')
      .set('Authorization', `Bearer token-falso`);

    const lines = res.text.trim().split('\n');
    // header + 2 clientes = 3 lines
    expect(lines.length).toBe(3);

    const row1 = lines[1].split(',');
    expect(row1[0]).toBe('Ana Torres');
    expect(row1[1]).toBe('2'); // frecuencia_visita
    expect(row1[4]).toBe('WHATSAPP');
    expect(row1[5]).toBe('Flat White');
  });

  it('marca churn_label=0 para cliente con interaccion reciente', async () => {
    const res = await request(app)
      .get('/api/reportes/export-apf3.csv')
      .set('Authorization', `Bearer token-falso`);

    const row1 = res.text.trim().split('\n')[1].split(',');
    expect(row1[6]).toBe('0');
  });

  it('marca churn_label=1 para cliente sin interacciones', async () => {
    const res = await request(app)
      .get('/api/reportes/export-apf3.csv')
      .set('Authorization', `Bearer token-falso`);

    const row2 = res.text.trim().split('\n')[2].split(',');
    expect(row2[6]).toBe('1');
  });

  it('muestra N/A para producto_favorito cuando es null', async () => {
    const res = await request(app)
      .get('/api/reportes/export-apf3.csv')
      .set('Authorization', `Bearer token-falso`);

    const row2 = res.text.trim().split('\n')[2].split(',');
    expect(row2[5]).toBe('N/A');
  });
});
