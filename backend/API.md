# API — Puku Puku CRM

Base URL: `http://localhost:4000/api`

Autenticación: `Authorization: Bearer <token>` (excepto `/auth/login`)

---

## Auth

### POST /api/auth/login

Autentica a un colaborador y devuelve un token JWT.

**Body:**
```json
{
  "email": "admin@pukupuku.pe",
  "password": "puku2026"
}
```

**Respuesta 200:**
```json
{
  "token": "eyJ...",
  "usuario": { "id": "uuid", "nombre": "Admin", "email": "admin@pukupuku.pe", "rol": "ADMINISTRADOR" }
}
```

**Errores:**
- `400` — email y password obligatorios
- `401` — credenciales inválidas

---

### POST /api/auth/registrar

Registra un nuevo colaborador. Solo accesible para `ADMINISTRADOR`.

**Body:**
```json
{
  "nombre": "Carlos",
  "email": "carlos@pukupuku.pe",
  "password": "segura123",
  "rol": "COLABORADOR"
}
```

**Respuesta 201:**
```json
{
  "id": "uuid",
  "nombre": "Carlos",
  "email": "carlos@pukupuku.pe",
  "rol": "COLABORADOR"
}
```

**Errores:**
- `400` — campos obligatorios faltantes
- `401` — no autenticado
- `403` — rol no autorizado (requiere ADMINISTRADOR)
- `409` — email ya registrado

---

## Clientes

### GET /api/clientes/buscar?q=texto&page=1&limit=10

Busca clientes por nombre o teléfono con paginación.

**Query params:**
| Parámetro | Default | Descripción |
|-----------|---------|-------------|
| `q` | — | Texto de búsqueda (mín 2 caracteres) |
| `page` | `1` | Número de página |
| `limit` | `10` | Resultados por página (máx 100) |

**Respuesta 200:**
```json
{
  "data": [
    { "id": "uuid", "nombreCompleto": "Ana Torres", "telefono": "999888777", "canalOrigen": "WHATSAPP", ... }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

**Respuesta 200 (sin query):** `[]`

**Errores:**
- `401` — no autenticado

---

### POST /api/clientes

Registra un nuevo cliente. **Requiere consentimiento explícito Ley N.° 29733.**

**Body:**
```json
{
  "nombreCompleto": "Ana Torres",
  "telefono": "999888777",
  "canalOrigen": "WHATSAPP",
  "productoFavorito": "Flat White",
  "restriccionesAlergias": "Intolerante a la lactosa",
  "consentimientoLey29733": true
}
```

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `nombreCompleto` | Sí | |
| `telefono` | Sí | Único en el sistema |
| `canalOrigen` | Sí | `PRESENCIAL`, `WHATSAPP`, `INSTAGRAM`, `RAPPI`, `PEDIDOSYA` |
| `productoFavorito` | No | |
| `restriccionesAlergias` | No | |
| `consentimientoLey29733` | Sí | Debe ser `true` |

**Respuesta 201:**
```json
{
  "id": "uuid",
  "nombreCompleto": "Ana Torres",
  "telefono": "999888777",
  "canalOrigen": "WHATSAPP",
  "consentimientoLey29733": true,
  "fechaConsentimiento": "2026-06-28T00:00:00.000Z",
  ...
}
```

**Errores:**
- `400` — campos obligatorios faltantes
- `400` — consentimiento no otorgado
- `401` — no autenticado
- `409` — teléfono ya existe (`{ error, clienteExistente: { id, nombre } }`)

---

### GET /api/clientes/:id

Obtiene detalle completo del cliente con historial de interacciones y métricas.

**Respuesta 200:**
```json
{
  "id": "uuid",
  "nombreCompleto": "Ana Torres",
  "telefono": "999888777",
  ...
  "interacciones": [ ... ],
  "metricas": {
    "frecuenciaVisita": 5,
    "ticketPromedioSoles": 18.50,
    "churnLabel": 0
  }
}
```

**Errores:**
- `401` — no autenticado
- `404` — cliente no encontrado

---

### PATCH /api/clientes/:id

Actualiza datos del cliente (producto favorito, alergias).

**Body:**
```json
{
  "productoFavorito": "Matcha Latte",
  "restriccionesAlergias": ""
}
```

**Respuesta 200:** objeto del cliente actualizado

**Errores:**
- `401` — no autenticado
- `404` — cliente no encontrado

---

## Interacciones

### POST /api/clientes/:id/interacciones

Abre una nueva interacción para un cliente.

**Body:**
```json
{
  "canal": "WHATSAPP",
  "resumenPedido": "Un café latte para llevar"
}
```

**Respuesta 201:**
```json
{
  "id": "uuid",
  "clienteId": "uuid",
  "canal": "WHATSAPP",
  "estado": "PENDIENTE",
  "colaboradorId": "uuid",
  ...
}
```

**Errores:**
- `400` — canal de origen obligatorio
- `401` — no autenticado
- `404` — cliente no encontrado

---

### PATCH /api/interacciones/:id/cerrar

Cierra una interacción abierta con los datos post-atención.

**Body:**
```json
{
  "montoSoles": 18.5,
  "actualizoPreferencia": true,
  "productoFavoritoNuevo": "Matcha Latte",
  "observacion": "Cliente pidió temperatura más alta",
  "satisfaccion": "SATISFECHO"
}
```

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `montoSoles` | No | Monto del pedido |
| `actualizoPreferencia` | No | Si se actualiza producto favorito |
| `productoFavoritoNuevo` | No* | Requerido si `actualizoPreferencia=true` |
| `observacion` | No | |
| `satisfaccion` | No | `SATISFECHO`, `NEUTRO`, `INSATISFECHO` |

**Respuesta 200:** objeto de la interacción actualizada

**Errores:**
- `401` — no autenticado
- `404` — interacción no encontrada
- `409` — la interacción ya fue cerrada por otro colaborador

---

## Reportes

Requieren rol `ADMINISTRADOR` o `GERENTE`.

### GET /api/reportes/clientes-frecuentes?minVisitas=3

Lista clientes recurrentes con frecuencia >= `minVisitas`.

**Respuesta 200:**
```json
{
  "minVisitas": 3,
  "total": 2,
  "clientes": [
    {
      "nombre": "Ana Torres",
      "frecuencia_visita": 5,
      "ticket_promedio_soles": 18.50,
      "canal_origen": "WHATSAPP",
      "producto_favorito": "Flat White",
      "churn_label": 0
    }
  ]
}
```

**Errores:**
- `401` — no autenticado
- `403` — rol no autorizado

---

### GET /api/reportes/dataset

Dataset completo en JSON para consumo externo (APF3).

**Respuesta 200:**
```json
{
  "total": 10,
  "registros": [
    {
      "nombre": "Ana Torres",
      "frecuencia_visita": 5,
      "ticket_promedio_soles": 18.50,
      "canal_origen": "WHATSAPP",
      "producto_favorito": "Flat White",
      "churn_label": 0
    }
  ]
}
```

**Errores:**
- `401` — no autenticado
- `403` — rol no autorizado

---

### GET /api/reportes/export-apf3.csv

Exporta el dataset como CSV — listo para pandas/scikit-learn.

**Columnas:** `nombre`, `frecuencia_visita`, `ticket_promedio_soles`, `canal_origen`, `producto_favorito`, `churn_label`

**Respuesta 200:** `text/csv` con header `Content-Disposition: attachment`

**Errores:**
- `401` — no autenticado
- `403` — rol no autorizado
