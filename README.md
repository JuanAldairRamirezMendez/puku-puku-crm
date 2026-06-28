# Puku Puku CRM - Panel de Atencion Unificado

Implementacion full-stack del prototipo disenado en el APF2 para LA CAPSULA S.A.C. / PUKU PUKU. El sistema complementa el piloto en HubSpot Free con una aplicacion propia basada en Express.js, PostgreSQL, Prisma y React.

## Estructura

```text
puku-puku-crm/
├── docker-compose.yml      # PostgreSQL local
├── backend/                # API REST Express + Prisma
│   ├── prisma/schema.prisma
│   ├── prisma/seed.js
│   └── src/
├── frontend/               # Pantallas del prototipo APF2
│   └── src/
└── checklist.md            # Pruebas manuales QA para APF3
```

## Requisitos

- Node.js 18 o superior.
- Docker Desktop iniciado.
- Git.

En Windows PowerShell, si `npm` o `npx` se bloquean por politica de ejecucion, usar `npm.cmd` y `npx.cmd`.

## Configuracion inicial

### 1. Base de datos

```bash
docker compose up -d
```

Esto levanta PostgreSQL en `localhost:5432`.

Si aparece un conflicto por un contenedor existente llamado `puku_puku_db`, actualizar el repositorio y volver a ejecutar el comando. El `docker-compose.yml` actual ya no fija `container_name`, para evitar choques entre copias locales del proyecto.

Si el puerto `5432` ya esta ocupado por otro PostgreSQL local, detener ese servicio antes de levantar Docker. En Windows puede aparecer como `postgresql-x64-18 - PostgreSQL Server 18`.

Como alternativa temporal, en PowerShell se puede levantar esta copia en otro puerto:

```powershell
$env:POSTGRES_PORT = "5433"
docker compose up -d
```

En ese caso, cambiar tambien `DATABASE_URL` y `DIRECT_URL` en `backend/.env` para usar `localhost:5433`.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:migrate
npm run seed
npm run dev
```

API local: `http://localhost:4000`.

Credenciales de prueba creadas por el seed:

- Admin: `admin@pukupuku.pe` / `puku2026`
- Colaborador: `carla@pukupuku.pe` / `puku2026`

### 3. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Interfaz local: `http://localhost:5173`.

## Verificacion rapida

```bash
cd backend
npx prisma validate

cd ../frontend
npm run build
```

Validacion de integracion ejecutada en Codex para la rama de Peter:

- Docker Compose: PostgreSQL publicado en `localhost:5432`.
- Prisma migrate: esquema sincronizado contra `127.0.0.1:5432`.
- Seed: usuarios de prueba creados sin cambiar credenciales del equipo.
- Backend: tests Jest `12/12` y smoke test de health/login/export CSV aprobados.
- Frontend: `npm.cmd run build` aprobado.

## Mapeo APF2 a codigo

| Pantalla / flujo | Backend | Frontend |
|---|---|---|
| Login | `auth.controller.js` | `LoginForm.jsx` |
| Pantalla 1 - Busqueda y registro | `clientes.controller.js` | `Pantalla1Registro.jsx` |
| Pantalla 2 - Historial | `clientes.controller.js` | `Pantalla2Historial.jsx` |
| Pantalla 3 - Cierre post-atencion | `interacciones.controller.js` | `Pantalla3PostAtencion.jsx` |
| Reporte clientes frecuentes | `reportes.controller.js` | `PantallaFrecuentes.jsx` |
| Dataset APF3 | `GET /api/reportes/export-apf3.csv` | Descarga CSV para notebook ML |

## Cumplimiento Ley N. 29733

- `POST /api/clientes` debe rechazar registros cuando `consentimientoLey29733 !== true`.
- El consentimiento se registra con fecha para trazabilidad.
- Las rutas protegidas usan JWT y control de rol.
- `JWT_SECRET` y `DATABASE_URL` deben vivir solo en `.env` local o variables del servidor.
- No se debe subir `backend/.env` al repositorio.

## Variables de entorno

Copiar `backend/.env.example` a `backend/.env` y ajustar:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/puku_puku_crm?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/puku_puku_crm?schema=public"
JWT_SECRET="reemplazar_por_un_secreto_largo_y_aleatorio"
JWT_EXPIRES_IN="8h"
CHURN_INACTIVITY_DAYS=30
```

La contraseña `postgres` del compose y la clave `puku2026` del seed son valores locales de desarrollo. Para una demo publicada o produccion, deben reemplazarse.

## Entregables APF3 relacionados

- `checklist.md`: casos de prueba manual para login, consentimiento, atencion y CSV.
- `docs/anexo-uso-ia-apf3.md`: declaracion de uso de IA lista para pegar en el informe.
- `GET /api/reportes/export-apf3.csv`: dataset con columnas para modelado ML.

## Flujo Git recomendado

```bash
git checkout dev
git pull origin dev
git checkout -b feature/peter-devops-qa

# despues de validar y documentar
git add README.md checklist.md docs/anexo-uso-ia-apf3.md docker-compose.yml .gitignore backend/.env.example
git commit -m "docs(devops): agregar QA y documentacion APF3"
git push origin feature/peter-devops-qa
```

Abrir Pull Request hacia `dev`. La validacion final hacia `main` debe ejecutarse cuando las ramas `Juan`, `camilo` y `renzo` esten integradas en `dev`.
