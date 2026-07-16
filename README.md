# Puku Puku CRM — Panel de Atención Unificado

Sistema full-stack para LA CÁPSULA S.A.C. / PUKU PUKU. Complementa el piloto en HubSpot Free con aplicación propia basada en **Express.js + PostgreSQL + Prisma + React**.

---

## Stack

| Capa     | Tecnología                                                                 |
| -------- | -------------------------------------------------------------------------- |
| Frontend | React 19, React Router 7, Zustand, react-i18next, Storybook 10, Vite      |
| Backend  | Express.js, Prisma ORM, JWT, Jest, Morgan, ExcelJS                        |
| BD       | PostgreSQL 16                                                              |
| ML       | Python (scikit-learn, XGBoost, LightGBM), pipeline en `backend/ml/`        |
| Infra    | Docker Compose (3 servicios), Nginx, PWA (manifest + service worker)       |

---

## Estructura

```
puku-puku-crm/
├── docker-compose.yml         # PostgreSQL + API + Web (Nginx)
├── backend/
│   ├── prisma/schema.prisma
│   ├── prisma/seed.js / seed-apf3.js
│   ├── src/                   # Controladores, rutas, middleware
│   └── ml/                    # Pipeline Python de churn prediction
├── frontend/
│   ├── public/
│   │   ├── manifest.json      # PWA manifest
│   │   ├── sw.js              # Service worker (cache-first)
│   │   └── icons/             # SVG/PNG icons 192/512
│   ├── src/
│   │   ├── components/        # LoginForm, Navbar, Skeleton, etc.
│   │   ├── pages/             # Pantalla1Registro, Pantalla2Historial, etc.
│   │   ├── i18n/              # es.json, en.json, index.js
│   │   ├── store/             # Zustand store
│   │   ├── styles/            # theme.css (sistema de tokens)
│   │   └── stories/           # Storybook stories
│   └── .storybook/            # Configuración de Storybook
├── apf3/                      # Pipeline académico APF3 (Python + Jupyter)
├── docs/                      # Documentación de soporte
└── scripts/                   # build-docker.ps1
```

---

## Requisitos

- Node.js 18+
- Docker Desktop
- Python 3.10+ (solo para ML)
- Git

> En Windows PowerShell, si `npm` o `npx` se bloquean, usar `npm.cmd` y `npx.cmd`.

---

## Configuración inicial

### 1. Base de datos + servicios (Docker)

```bash
docker compose up -d
```

Levanta PostgreSQL (`:5432`), API (`:4000`) y Nginx (`:8080`).

### 2. Backend (solo si no usas Docker)

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:migrate
npm run seed
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Interfaz local: `http://localhost:5173`. Con Docker: `http://localhost:8080`.

### Credenciales de prueba

| Rol           | Email                 | Password  |
| ------------- | --------------------- | --------- |
| Administrador | admin@pukupuku.pe     | puku2026  |
| Colaborador   | carla@pukupuku.pe     | puku2026  |

---

## Scripts disponibles

### Frontend

| Comando               | Descripción                            |
| --------------------- | -------------------------------------- |
| `npm run dev`         | Servidor de desarrollo Vite            |
| `npm run build`       | Build producción                       |
| `npm run preview`     | Vista previa del build                 |
| `npm run storybook`   | Servidor de desarrollo Storybook       |
| `npm run build:sb`    | Build estático de Storybook            |
| `npx vitest`          | Pruebas unitarias (Vitest)             |
| `npx vitest --project storybook` | Pruebas de accesibilidad desde stories |

### Backend

| Comando                    | Descripción                          |
| -------------------------- | ------------------------------------ |
| `npm run dev`              | Servidor con nodemon                 |
| `npm test`                 | Tests Jest                           |
| `npm run prisma:migrate`   | Ejecutar migraciones                 |
| `npm run seed`             | Seed de prueba (2 clientes)          |
| `npm run seed:apf3`        | Seed académico (150+ clientes)       |
| `npm run ml:train`         | Entrenar modelo de churn local       |

---

## i18n — Internacionalización

Soporte español (`es`) e inglés (`en`). Archivos en `frontend/src/i18n/`.

- Cambio de idioma persistido en `localStorage` (`puku-lang`).
- Switcher ES/EN en la barra de navegación.
- Por defecto: español.

---

## PWA

- `manifest.json` con nombre, íconos SVG (192/512) y theme-color `#c1502e`.
- Service worker (`sw.js`) con estrategia **cache-first** para assets estáticos.
- Instalable como aplicación de escritorio/móvil.

---

## Storybook

```bash
cd frontend
npm run storybook
```

Components documentados: `LoginForm`, `Navbar`, `Skeleton`. Incluye addons de **a11y**, **docs** y **vitest**.

```bash
npx vitest --project storybook   # Ejecuta tests de accesibilidad
```

---

## API — Endpoints principales

| Método | Ruta                          | Descripción                    | Auth     |
| ------ | ----------------------------- | ------------------------------ | -------- |
| POST   | `/api/auth/login`             | Iniciar sesión                 | Público  |
| POST   | `/api/auth/register`          | Registrar colaborador          | Admin    |
| GET    | `/api/clientes?q=`            | Buscar clientes                | Usuario  |
| POST   | `/api/clientes`               | Crear cliente                  | Usuario  |
| GET    | `/api/clientes/:id`           | Detalle + últimas interacciones | Usuario  |
| POST   | `/api/interacciones`          | Registrar atención             | Usuario  |
| GET    | `/api/reportes/frecuentes`    | Clientes frecuentes            | Usuario  |
| GET    | `/api/reportes/analytics`     | KPIs + gráficos                | Usuario  |
| GET    | `/api/reportes/export-apf3.csv` | Dataset para ML              | Usuario  |
| POST   | `/api/reportes/entrenar`      | Entrenar modelo churn          | Admin/Gte|
| GET    | `/api/auditoria`              | Logs de auditoría              | Admin    |
| GET    | `/api/experimentos`           | Experimentos ML                | Admin    |
| GET    | `/api/feature-store`          | Feature store                  | Admin    |
| GET    | `/api/ab-test`                | Tests A/B                      | Admin    |
| GET    | `/api/health`                 | Health check                   | Público  |

---

## Machine Learning

### Pipeline de producción (`backend/ml/`)

Entrenamiento de 11 modelos (GradientBoosting, RandomForest, XGBoost, etc.) con 20+ features. Se ejecuta desde la pantalla Analytics del frontend o via `POST /api/reportes/entrenar`.

### Pipeline académico (`apf3/`)

Script Python y Jupyter Notebook para la consigna de APF3:

```bash
cd apf3
pip install -r requirements.txt
python pipeline_apf3.py                  # desde API
python pipeline_apf3.py --csv dataset.csv # desde CSV local
```

### Dataset simulado

```bash
cd backend
npm run seed:apf3   # 150+ clientes, ~20% churn, listo para modelado
```

---

## Docker Compose

```bash
docker compose up -d --build
```

| Servicio   | Puerto | Base              |
| ---------- | ------ | ----------------- |
| `postgres` | 5432   | postgres:16-alpine |
| `api`      | 4000   | node:22-bookworm-slim |
| `web`      | 8080   | nginx:alpine      |

Health checks implementados en los 3 servicios.

---

## Cumplimiento Ley N.° 29733

- Consentimiento obligatorio (`consentimientoLey29733 === true`).
- Trazabilidad con fecha de consentimiento.
- JWT con control de rol.
- `JWT_SECRET` y `DATABASE_URL` solo en `.env` local.

---

## Checklist

Ver `checklist.md` para pruebas manuales QA.

## Anexo IA

Ver `docs/anexo-uso-ia-apf3.md` para declaración de uso de IA.
