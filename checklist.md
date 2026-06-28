# Checklist QA Manual - APF3 Puku Puku CRM

Responsable: Adams Saldivar, Peter Amedh  
Objetivo: verificar que el CRM sea reproducible y que los flujos criticos alimenten correctamente el dataset de APF3.

## Estado de setup

| Prueba | Pasos | Resultado esperado | Estado |
|---|---|---|---|
| Docker Compose | Ejecutar `docker compose up -d` desde la raiz. | PostgreSQL queda activo en `localhost:5432`. | Aprobado en Codex: `github-puku-puku-crm-postgres-1` quedo en `0.0.0.0:5432->5432`. Se detuvo el servicio local `postgresql-x64-18` que ocupaba el puerto. |
| Prisma schema | Ejecutar `cd backend` y `npx.cmd prisma validate`. | El esquema Prisma es valido. | Aprobado en Codex. |
| Migraciones | Ejecutar `npm run prisma:migrate`. | Las tablas se crean sin errores. | Aprobado en Codex contra `127.0.0.1:5432`; Prisma reporto esquema sincronizado. |
| Seed | Ejecutar `npm run seed`. | Se crean usuarios de prueba y datos iniciales. | Aprobado en Codex; credenciales de prueba intactas: `admin@pukupuku.pe` y `carla@pukupuku.pe` con clave `puku2026`. |
| Backend | Ejecutar `npm run dev`. | API disponible en `http://localhost:4000`. | Aprobado con smoke test temporal: `/api/health`, login admin y export CSV respondieron 200. |
| Frontend | Ejecutar `npm run dev`. | Interfaz disponible en `http://localhost:5173`. | Pendiente de validacion visual manual en navegador local. |
| Build frontend | Ejecutar `npm.cmd run build`. | Vite genera `dist/` sin errores. | Aprobado en Codex. |

## Flujos funcionales criticos

| Caso | Datos / pasos | Resultado esperado |
|---|---|---|
| Login admin | Ingresar `admin@pukupuku.pe` / `puku2026`. | Acceso exitoso; se muestra el panel principal y opciones de reporte/admin si aplican. |
| Login colaborador | Ingresar `carla@pukupuku.pe` / `puku2026`. | Acceso exitoso; el colaborador puede registrar y consultar clientes. |
| Login invalido | Ingresar correo valido con clave incorrecta. | La API responde error y la interfaz muestra mensaje comprensible sin exponer detalles internos. |
| Registro sin consentimiento | Completar cliente nuevo y dejar desmarcado `consentimientoLey29733`. | El boton guardar permanece bloqueado en frontend o la API rechaza con error 400. No se crea cliente. |
| Registro con consentimiento | Completar nombre, telefono, canal, producto favorito y marcar consentimiento. | Cliente creado; se guarda fecha de consentimiento y aparece en busqueda/historial. |
| Telefono duplicado | Intentar crear un cliente con telefono ya registrado. | Se muestra error claro; el formulario conserva los datos escritos. |
| Busqueda por nombre | Buscar un cliente existente por parte del nombre. | Resultados visibles en menos de 5 segundos. |
| Busqueda por telefono | Buscar con el telefono exacto o parcial. | Se muestra el cliente correcto con datos principales. |
| Historial de cliente | Abrir la Pantalla 2 desde una tarjeta de cliente. | Se ve feed cronologico con canal, resumen, colaborador, estado y metricas rapidas. |
| Apertura de atencion | Crear o abrir una interaccion pendiente. | La atencion queda asociada al cliente y lista para cierre. |
| Cierre post-atencion | Registrar resumen, monto, canal, satisfaccion y observacion. | La interaccion pasa a estado cerrado/resuelto; actualiza frecuencia y ticket promedio. |
| Actualizar preferencia | Cerrar atencion marcando actualizar producto favorito. | El campo `productoFavorito` del cliente queda actualizado. |
| Reporte frecuentes | Abrir pantalla de clientes frecuentes. | Se listan clientes recurrentes segun minimo de visitas configurado. |
| Exportar CSV APF3 | Descargar `GET /api/reportes/export-apf3.csv`. | El CSV se descarga con columnas: `nombre`, `frecuencia_visita`, `ticket_promedio_soles`, `canal_origen`, `producto_favorito`, `churn_label`. |
| Variables sensibles | Revisar repo con `rg "JWT_SECRET|DATABASE_URL|POSTGRES_PASSWORD"`. | No hay secretos productivos hardcodeados; `.env` no esta versionado. |

## Criterio de aprobacion para merge a main

- Todos los casos criticos deben estar aprobados en `dev`.
- No debe existir `.env` versionado.
- `node_modules/` no debe estar versionado.
- El CSV APF3 debe abrirse en Excel o pandas sin columnas faltantes.
- La validacion final debe ejecutarse despues de integrar las ramas `Juan`, `camilo` y `renzo`.
