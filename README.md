# DeioActiva (Fase 1)

Plataforma de seguimiento de tareas, módulos e hitos de un producto en desarrollo.
Esta primera fase entrega **solo**: arquitectura base, autenticación, modelo de datos en
MySQL/MariaDB y el layout visual. No incluye Gantt, importación, reportes ni IA todavía
(ver `DECISIONES.md` para el detalle completo de alcance y decisiones tomadas).

Repositorio independiente del proyecto Gestión Activa: no comparte código ni base de datos.

## Stack

- **Backend:** NestJS + TypeScript + Prisma ORM + MySQL/MariaDB, auth propia (bcrypt + JWT +
  refresh token + guards por rol), sin Firebase.
- **Frontend:** React + TypeScript + Vite + TailwindCSS.

## Estructura

```
deioactiva/
  backend/     API NestJS (puerto 3001, prefijo /api)
  frontend/    SPA React (puerto 5173)
  docker-compose.yml   MySQL local para desarrollo
```

## Requisitos

- Node.js 20+ y npm
- MySQL o MariaDB 8+ accesible (local, Docker, o el `docker-compose.yml` incluido)

## Instalación

### 1. Base de datos

Con Docker instalado y funcionando en tu máquina:

```bash
docker compose up -d
```

Esto levanta MySQL 8 en `localhost:3306` con la base `deioactiva` y el usuario
`deioactiva` / `deioactiva` (ver `docker-compose.yml`). Si preferís usar una instancia
de MySQL/MariaDB propia, no hace falta Docker: solo ajustá `DATABASE_URL` en el paso
siguiente.

### 2. Backend

```bash
cd backend
cp .env.example .env
# completar .env (ver "Variables de entorno" abajo)
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```

API disponible en `http://localhost:3001/api`, documentación Swagger en
`http://localhost:3001/api/docs`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App disponible en `http://localhost:5173`.

## Variables de entorno a completar

`backend/.env` (a partir de `backend/.env.example`):

- `DATABASE_URL`: cadena de conexión a MySQL/MariaDB. El valor de ejemplo ya funciona
  con el `docker-compose.yml` incluido.
- `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`: **generar valores propios**, no dejar el
  placeholder (por ejemplo con `openssl rand -hex 32`).
- `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` / `SEED_SUPER_ADMIN_NAME`: datos
  del primer usuario `super_admin`, creado por `npm run seed`. Cambiar la password de
  ejemplo antes de correr el seed en cualquier ambiente compartido.
- `FRONTEND_URL`: origen permitido por CORS (por defecto `http://localhost:5173`).

`frontend/.env` (a partir de `frontend/.env.example`):

- `VITE_API_URL`: URL base de la API (por defecto `http://localhost:3001/api`).

## Roles y seed inicial

El seed (`backend/prisma/seed.ts`) crea:

- Los 5 roles: `super_admin`, `admin`, `developer`, `tester`, `reuniones`. Además, el
  backend crea al arrancar cualquier rol de `ROLE_CODES` que falte en la base (sin tocar
  los existentes), así un rol nuevo no depende de volver a correr el seed en producción.
- El primer usuario, `super_admin`, con los datos de `SEED_SUPER_ADMIN_*`.
- Los módulos iniciales: Alta / Perfil DEO, Legajos, Gestión de Comunicación (con los
  submódulos Trámites y Comunicación), Familia G.

El seed es idempotente (usa `upsert`): correrlo de nuevo no duplica datos.

## Scripts útiles (backend)

- `npm run start:dev` — servidor con reload en caliente
- `npm run build` — build de producción (`dist/`)
- `npm run prisma:studio` — explorador visual de la base
- `npm run prisma:migrate` — nueva migración en desarrollo
- `npm run seed` — vuelve a correr el seed

## Scripts útiles (frontend)

- `npm run dev` — servidor de desarrollo
- `npm run build` — type-check (`tsc`) + build de producción (`dist/`)

## Seguridad y RBAC

Los guards son centralizados (`JwtAuthGuard` + `RolesGuard`, aplicados globalmente en
`app.module.ts`): un endpoint se protege agregando `@Roles('admin', 'developer')`, sin
repetir verificaciones de rol en cada controller. `super_admin` siempre tiene acceso
completo. Un endpoint público (login, refresh, health) se marca con `@Public()`.

**Roles acotados** (`SCOPED_ROLE_CODES`: `reuniones` y `qa`): por defecto el
`RolesGuard` les rechaza *cualquier* endpoint, aunque no tenga `@Roles(...)`; solo pasan en
los marcados con `@ScopedRolesAllowed('reuniones')` (el controller de Reuniones y
`GET /auth/me`). En el frontend, `config/roles.ts` (`SCOPED_ROLE_PATHS`) oculta el resto del
menú y redirige cualquier otra ruta a la sección del perfil.

**Roles adicionales** (`UserAdditionalRole`): además del rol principal, un usuario puede
tener roles extra (se eligen en Usuarios → Editar). El guard trabaja con la lista completa
(`user.roles`): un usuario se trata como acotado solo si *todos* sus roles son acotados, y
pasa en un endpoint si alguno de sus roles está habilitado. Ej.: Reuniones + QA ve las dos
secciones.

## QA / Reportes

Perfil `qa` para quienes prueban el sistema y reportan problemas:

- Los reportes entran siempre en la columna **QA / Reportes** (`WorkItemStatus.QA_REPORT`),
  como Error y con prioridad Media. Guardan el establecimiento y la severidad sugerida; la
  prioridad real la decide el equipo al hacer el triage (moviendo la tarjeta a Pendiente).
- Si el reporte no indica módulo, cae en el módulo "Reportes QA" (se crea solo).
- El usuario QA ve todas las columnas pero solo las tarjetas que cargó; puede comentarlas y
  adjuntar capturas, pero no moverlas, editarlas, cambiar prioridad ni borrarlas. Una
  tarjeta ajena le responde 404.
- Cuando una tarjeta creada por alguien con rol QA pasa a Completado, le llega un aviso
  (campanita, `Notification`) para que valide la corrección.
- Un admin o developer que además tenga QA trabaja normalmente (sin estas restricciones).

## Reuniones

Sección `/reuniones`, basada en el módulo Reuniones de Gestión Activa:

- Reunión: título, área convocante, fecha, horario, lugar, frecuencia, estado (Programada /
  En curso / Finalizada / Cancelada), participantes (usuarios del sistema o externos) con
  registro de asistencia, y observaciones generales del acta.
- Orden del día: puntos a tratar (Tema / Acción / Decisión / Seguimiento / Nota) con
  estado, responsable, fecha de control, **resolución** e historial de avances.
- **Tareas desde la reunión**: "Generar tareas" convierte en lote los puntos elegidos en
  tareas del Kanban (`POST /meetings/:id/work-items`). Vienen pre-tildados los accionables
  abiertos sin tarea (Requerimiento, Acción, Seguimiento) y el tipo de tarea se propone
  según el tipo de punto (Requerimiento → Requerimiento, Acción → Tarea, Seguimiento →
  Análisis). Al finalizar la reunión se avisa si quedan puntos accionables sin tarea.
- **Sincronización tarea → punto** (`meetings/meeting-point-sync.ts`, llamado desde
  `WorkItemsService.update`): tarea Completada → punto Resuelto, Descartada → Descartado,
  en curso → punto En curso; cada cambio deja un avance automático en el punto. Los puntos
  con tarea cerrada no se arrastran con "Traer pendientes".
- "Traer pendientes": copia los puntos abiertos de una reunión anterior a la actual,
  enlazados entre sí (↩ viene de / ↪ trasladado a).
- Tablero "Puntos pendientes" de todas las reuniones, filtrable por responsable, y acta
  imprimible en `/reuniones/:id/acta`.
- Permisos: `super_admin`, `admin` y `reuniones` gestionan; `developer`/`tester` pueden ver
  y cargar avances de seguimiento.

## Estado de esta entrega y próximos pasos

Ver `DECISIONES.md` para el detalle de qué se decidió respecto del prompt original, qué
quedó fuera de alcance a propósito, y qué falta correr en un entorno con acceso normal a
internet (instalación de dependencias, generación de Prisma Client y migraciones) — el
entorno donde se generó este código tiene bloqueado el dominio de binarios de Prisma por
política de red, así que esos pasos específicos quedaron pendientes de ejecutar del lado
de quien despliega esto.
