# Anexo - Declaracion de Uso de Inteligencia Artificial APF3

Curso: Innovacion y Transformacion Digital - UTP 2026-1  
Proyecto: Puku Puku CRM / LA CAPSULA S.A.C.  
Equipo: Adams Saldivar, Asencio Bravo, Ramirez Mendez, Ramos Atuncar

## Declaracion general

El equipo utilizo herramientas de inteligencia artificial como apoyo para analisis, programacion, depuracion, documentacion tecnica y preparacion de entregables. Las decisiones finales, validaciones funcionales, interpretacion academica y responsabilidad del contenido fueron asumidas por los integrantes del equipo.

La IA no reemplazo la verificacion humana. Cada salida fue revisada contra la consigna APF3, el APF2 presentado previamente, el codigo fuente del repositorio y los criterios de cumplimiento de la Ley N. 29733.

## Registro de prompts y validacion humana

| Integrante | Frente | Prompt utilizado | Herramienta | Validacion humana |
|---|---|---|---|---|
| Ramirez Mendez, Juan Aldair | Backend y base de datos | Se pidio actuar como ingeniero backend senior en Node.js, Express, PostgreSQL y Prisma; revisar inconsistencias; crear pruebas para consentimiento, cierre de interacciones y exportacion CSV; agregar paginacion; documentar endpoints en `API.md`. | Asistente de IA para codigo | Juan reviso contratos de API, ejecucion de Prisma, estructura de controladores y compatibilidad con frontend. Peter valida funcionalmente antes del merge a `dev`. |
| Asencio Bravo, Camilo Diego | Frontend Pantallas 1 y 3 | Se pidio actuar como desarrollador frontend React con foco en accesibilidad y proteccion de datos; agregar validacion de telefono peruano, contador de cierre en 45 segundos, navegacion por teclado y mensajes de error amigables. | Asistente de IA para codigo | Camilo reviso comportamiento en navegador, textos de interfaz y preservacion de datos del formulario ante errores. Revision cruzada recomendada por Renzo. |
| Ramos Atuncar, Renzo Jair | Frontend Pantalla 2 y reportes | Se pidio actuar como desarrollador frontend React y visualizacion operativa; agregar indicador de riesgo `churn_label`, filtro por `canal_origen`, boton de exportacion CSV y mejora de legibilidad para historiales largos. | Asistente de IA para codigo | Renzo verifico que los datos mostrados existan en API y que no se agreguen librerias innecesarias. Revision cruzada recomendada por Camilo. |
| Adams Saldivar, Peter Amedh | QA, DevOps, cumplimiento y documentacion | Se pidio actuar como ingeniero QA/DevOps y redactor tecnico; seguir README, levantar Docker, correr migraciones/seed/backend/frontend, corregir documentacion, crear checklist manual, redactar anexo de IA y verificar secretos. | Codex / ChatGPT como asistente de desarrollo | Peter contrasto la salida con la consigna APF3, APF2, README, Docker, Prisma y busqueda de variables sensibles. Se documento lo aprobado y lo pendiente de repetir tras integrar ramas. |

## Evidencia de validacion realizada por Peter

- Se reviso la consigna APF3 y se identificaron exigencias de reproducibilidad, dependencias declaradas, anexo de prompts, normativa y datos para ML.
- Se reviso APF2 para mantener continuidad con el problema de CRM, Ley N. 29733, flujo de tres pantallas y variables `frecuencia_visita`, `ticket_promedio_soles`, `canal_origen`, `producto_favorito` y `churn_label`.
- Se consulto el repositorio GitHub del equipo y se confirmo que `main`, `dev` y `feature` apuntaban al commit inicial, mientras `Juan`, `camilo` y `renzo` tenian avances separados.
- Se valido el esquema Prisma con `npx.cmd prisma validate`.
- Se detecto que `backend/.env` y `node_modules/` estaban versionados, por lo que se agrego `.gitignore` y se preparo su retiro del control de versiones.
- Se detecto conflicto de Docker por un contenedor local llamado `puku_puku_db`; se ajusto `docker-compose.yml` para no fijar `container_name`.
- Se dejo checklist manual para ejecutar la validacion completa cuando las ramas del equipo esten integradas.

## Limitaciones declaradas

- La validacion funcional completa debe repetirse en la rama `dev` despues de integrar los cambios de Juan, Camilo y Renzo.
- En el entorno Codex, el build de frontend con Vite fallo por permisos del sandbox al leer rutas superiores. No se considera evidencia concluyente de error de codigo; debe ejecutarse en terminal local normal.
- Las credenciales `puku2026` son datos de prueba generados por seed. No deben usarse en produccion.

## Responsabilidad academica

El equipo declara que todo codigo, metrica, conclusion y material presentado fue revisado por integrantes humanos antes de la entrega. Cualquier supuesto derivado de datos simulados o limitaciones de integracion se declara explicitamente en el informe APF3.
