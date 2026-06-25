# Puku Puku CRM — Panel de Atención Unificado

Implementación full-stack del prototipo diseñado en el **APF2** (Design Thinking + Scrum)
para LA CÁPSULA S.A.C. / PUKU PUKU. Reemplaza/complementa el piloto en HubSpot Free con
un sistema propio: **Express.js + PostgreSQL (Prisma) + React**.

## Estructura

```
puku-puku-crm/
├── docker-compose.yml      # PostgreSQL local
├── backend/                # API REST (Express + Prisma)
│   ├── prisma/schema.prisma
│   ├── prisma/seed.js
│   └── src/...
└── frontend/               # Las 3 pantallas del prototipo (React + Vite)
    └── src/...
```

## Cómo correrlo

### 1. Base de datos
```bash
docker compose up -d        # levanta PostgreSQL en localhost:5432
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # ajusta JWT_SECRET si quieres
npm install
npm run prisma:migrate      # crea las tablas
npm run seed                # usuarios y cliente de prueba
npm run dev                 # http://localhost:4000
```
Credenciales de prueba (creadas por el seed):
- Admin: `admin@pukupuku.pe` / `puku2026`
- Colaborador: `carla@pukupuku.pe` / `puku2026`

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxy a la API en :4000)
```

## Mapeo Pantallas APF2 → Código

| Pantalla APF2 | Backend | Frontend |
|---|---|---|
| 1. Búsqueda y registro | `clientes.controller.js` (`buscar`, `crear`) | `Pantalla1Registro.jsx` |
| 2. Historial de interacciones | `clientes.controller.js` (`obtenerDetalle`) | `Pantalla2Historial.jsx` |
| 3. Registro post-atención | `interacciones.controller.js` (`cerrar`) | `Pantalla3PostAtencion.jsx` |
| US04 Reporte clientes frecuentes | `reportes.controller.js` | `PantallaFrecuentes.jsx` |
| Puente a APF3 (dataset ML) | `GET /api/reportes/export-apf3.csv` | — (se descarga y se usa en el notebook Python) |

## Cumplimiento normativo embebido (Ley N.° 29733)
- El endpoint `POST /api/clientes` **rechaza** el registro si `consentimientoLey29733 !== true` (replica el bloqueo del botón "Guardar" del prototipo en papel).
- Autenticación JWT + control de acceso por rol (`requireRole`) en rutas de reportes y administración.
- `twoFactorEnabled` ya modelado en `Usuario` para activar 2FA real (TOTP) como siguiente iteración.

## Siguiente paso natural (puente a APF3)
`GET /api/reportes/export-apf3.csv` entrega exactamente las columnas que pide la consigna de
APF3 (`frecuencia_visita`, `ticket_promedio_soles`, `canal_origen`, `producto_favorito`,
`churn_label`), listas para cargarse con `pandas` en el notebook de K-Means / clasificación.
