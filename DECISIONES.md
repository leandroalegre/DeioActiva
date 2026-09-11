# Decisiones tomadas respecto del prompt original

Este documento existe para que quede explícito qué se decidió por cuenta propia al llenar
huecos que el prompt original no especificaba, y qué quedó fuera del alcance de Fase 1 a
propósito. Nada de esto cambia el stack, el modelo de datos pedido ni el alcance de fase
— son detalles de implementación que había que resolver de una forma u otra.

## Decisiones de diseño

- **Refresh token en tabla propia (`RefreshToken`), no dentro de `User`.** Permite revocar
  sesiones individuales (por dispositivo) y detectar reuso de un token ya rotado. Se
  entrega en el body de la respuesta (no como cookie httpOnly) para simplificar las
  pruebas en esta fase vía Swagger/Postman. **Antes de exponer esto a producción real**,
  evaluar mover el refresh token a una cookie httpOnly — el frontend ya aísla el acceso a
  los tokens en `lib/api-client.ts`, así que el cambio queda contenido ahí.
- **Validación DTO con `class-validator` + `class-transformer`**, con `ValidationPipe`
  global (`whitelist`, `forbidNonWhitelisted`, `transform`).
- **`Role.code` es un string único, no un enum de Prisma.** Se puede sumar un rol nuevo
  editando el seed, sin generar una migración.
- **Se agregó `createdById` a `Module` y `Milestone`** (el prompt original solo lo pedía
  en `WorkItem`), para auditoría consistente entre entidades.
- **`WorkItemHistory.action` es un enum (`HistoryAction`)**, no un string libre, para que
  el historial no termine con valores inconsistentes.
- **`Module.slug` y `Role.code` son únicos** a nivel de base de datos.
- **No se agregó fecha objetivo a `Module`** — el prompt original lo deja explícitamente
  para una fase posterior ("un módulo podrá posteriormente tener fecha objetivo").
- **Paginación (`page`/`pageSize`) en los listados** de users, modules (el árbol se
  devuelve completo, sin paginar, por ser pocos registros), work-items, milestones e
  history.
- **Swagger/OpenAPI** en `/api/docs`, con seguridad Bearer configurada.
- **`GET /roles`** se agregó (no estaba en la lista de endpoints del prompt, pero el
  módulo `roles` estaba pedido en la lista de módulos iniciales, y el frontend necesita
  poder listar roles para el combo de asignación en Usuarios). Es de solo lectura.
- **RBAC aplicado:** `users`, `modules` (escritura) y `milestones` (escritura) requieren
  rol `admin` o superior. `work-items` y `comments` quedan abiertos a cualquier usuario
  autenticado, porque developer y tester necesitan trabajar sobre las tareas según el
  prompt original. `super_admin` siempre tiene acceso total (bypass en `RolesGuard`).
- **Monorepo con dos `package.json` independientes** (no npm workspaces), por simplicidad
  en esta fase — backend y frontend se instalan y corren por separado.
- **Frontend:** se sumó `react-router-dom` (ruteo), `@tanstack/react-query` (fetching de
  datos, para no reinventar cache/loading state en fases futuras) y `axios` (cliente HTTP
  con interceptor de refresh automático). Ninguna de estas piezas estaba explícita en el
  prompt, pero son estándar para este stack y evitan decisiones ad-hoc más adelante.

## Fuera de alcance (a propósito, según el prompt original)

Gantt, importación, reportes, IA, estadísticas complejas en el dashboard, deploy,
configuración de producción, validación de fechas de tarea contra fecha objetivo del
módulo/producto (depende de que el módulo tenga fecha objetivo, que es de una fase
posterior).

## Pendiente de ejecutar fuera de este entorno

El entorno donde se generó este código es una sandbox con una política de red que
**bloquea el dominio `binaries.prisma.sh`** (403 a nivel de gateway), que es de donde
Prisma descarga los binarios del motor necesarios para `prisma generate` y
`prisma migrate`. No es un error del código: es una restricción de red de este entorno
puntual, no de tu máquina ni de Cursor.

Por eso, estos pasos del checklist original quedaron para correr en un entorno con
acceso normal a internet (tu máquina, o donde vayas a levantar esto):

1. `cd backend && npm install` (ya probado en este entorno, funciona)
2. `npx prisma generate`
3. `npx prisma migrate dev --name init` (con MySQL/MariaDB corriendo — el
   `docker-compose.yml` incluido lo resuelve)
4. `npm run seed`
5. `npm run build` (backend) — no se pudo correr en este entorno porque el build
   depende de los tipos que genera `prisma generate` en el paso 2.

El **frontend sí se instaló, se tipó (`tsc`) y se buildeó sin errores en este entorno**
(no depende de Prisma).

Todo el código del backend fue escrito y revisado a mano con esa limitación en mente;
no hay forma de garantizar al 100% que compile hasta correr `prisma generate` en un
entorno con acceso a internet, pero el diseño (DTOs, servicios, nombres de campos)
sigue exactamente el `schema.prisma` incluido.
