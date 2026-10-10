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
  // Perfil acotado: reporta problemas en el tablero de Tareas (columna "QA / Reportes") y solo
  // ve las tarjetas que cargo. Se puede sumar como rol adicional a otro perfil.
  QA: 'qa',
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
  qa: 'QA / Reportes',
};

// Roles "acotados": solo pueden usar los endpoints marcados explicitamente con
// @ScopedRolesAllowed(...). Todo lo demas (tareas, modulos, hitos, etc.) les queda vedado
// en el RolesGuard, aunque el endpoint no tenga @Roles(...).
export const SCOPED_ROLE_CODES: RoleCode[] = [ROLE_CODES.REUNIONES, ROLE_CODES.QA];

// Quienes pueden crear/editar/eliminar reuniones y sus puntos (super_admin siempre pasa).
export const MEETING_MANAGER_ROLES: RoleCode[] = [ROLE_CODES.ADMIN, ROLE_CODES.REUNIONES];

// Un usuario tiene un rol principal (User.role) y opcionalmente roles adicionales
// (UserAdditionalRole). Estas funciones trabajan sobre la lista completa de codigos.
export function hasRole(user: { roles: string[] } | undefined | null, code: RoleCode): boolean {
  return !!user?.roles.includes(code);
}

// Acotado = todos sus roles son acotados. Si ademas tiene un rol completo (ej. developer),
// ese rol manda y no se le aplica ninguna restriccion de perfil acotado.
export function isScopedUser(user: { roles: string[] } | undefined | null): boolean {
  if (!user || user.roles.length === 0) return false;
  return user.roles.every((code) => SCOPED_ROLE_CODES.includes(code as RoleCode));
}

// Usuario QA "puro" en el tablero: solo ve sus tarjetas, solo crea en la columna QA, no mueve
// ni prioriza. Un admin o developer con QA adicional sigue trabajando normalmente.
export function isQaRestricted(user: { roles: string[] } | undefined | null): boolean {
  return hasRole(user, ROLE_CODES.QA) && isScopedUser(user);
}
