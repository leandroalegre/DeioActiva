// Roles iniciales del sistema (ver README para como agregar uno nuevo sin migrar el schema:
// Role.code es un string unico en la base, no un enum de Prisma, para poder sumar roles a futuro
// (ej: "viewer") con solo un insert/seed, sin generar una migracion nueva).
export const ROLE_CODES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  TESTER: 'tester',
  // Perfil acotado: solo gestiona la seccion Reuniones (ver SCOPED_ROLE_CODES).
  REUNIONES: 'reuniones',
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

// Nombres visibles de cada rol. Los usa RolesService para asegurar al arrancar que todos los
// roles existan en la base (asi un rol nuevo no depende de correr el seed en produccion).
export const ROLE_NAMES: Record<RoleCode, string> = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  developer: 'Desarrollador',
  tester: 'Tester',
  reuniones: 'Reuniones',
};

// Roles "acotados": solo pueden usar los endpoints marcados explicitamente con
// @ScopedRolesAllowed(...). Todo lo demas (tareas, modulos, hitos, etc.) les queda vedado
// en el RolesGuard, aunque el endpoint no tenga @Roles(...).
export const SCOPED_ROLE_CODES: RoleCode[] = [ROLE_CODES.REUNIONES];

// Quienes pueden crear/editar/eliminar reuniones y sus puntos (super_admin siempre pasa).
export const MEETING_MANAGER_ROLES: RoleCode[] = [ROLE_CODES.ADMIN, ROLE_CODES.REUNIONES];
