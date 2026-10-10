// Codigos de rol usados en el frontend (espejo de backend/src/common/constants/roles.constant.ts).
export const ADMIN_ROLES = ['super_admin', 'admin'];

// Pueden crear/editar/eliminar reuniones y sus puntos.
export const MEETING_MANAGER_ROLES = ['super_admin', 'admin', 'reuniones'];

export const QA_ROLE = 'qa';

// Roles acotados: solo ven las rutas listadas y su "home" es la primera. El backend aplica
// la misma restriccion (RolesGuard + @ScopedRolesAllowed), esto es solo la parte visual.
export const SCOPED_ROLE_PATHS: Record<string, string[]> = {
  reuniones: ['/reuniones'],
  qa: ['/tareas'],
};

// Un usuario tiene rol principal + roles adicionales; user.roles trae todos los codigos.
// Se aceptan tambien usuarios guardados antes de que existiera "roles".
type RoleHolder = { roles?: string[]; role?: { code: string } } | null | undefined;

export function roleCodesOf(user: RoleHolder): string[] {
  if (!user) return [];
  if (user.roles?.length) return user.roles;
  return user.role ? [user.role.code] : [];
}

export function hasAnyRole(user: RoleHolder, codes: string[]): boolean {
  return roleCodesOf(user).some((c) => codes.includes(c));
}

// Rutas permitidas para un usuario acotado (union de sus roles), o null si tiene algun rol
// completo y puede ver todo.
export function scopedPathsFor(user: RoleHolder): string[] | null {
  const codes = roleCodesOf(user);
  if (codes.length === 0 || !codes.every((c) => c in SCOPED_ROLE_PATHS)) return null;
  return codes.flatMap((c) => SCOPED_ROLE_PATHS[c]);
}

export function isPathAllowedFor(user: RoleHolder, pathname: string): boolean {
  const scoped = scopedPathsFor(user);
  if (!scoped) return true;
  return scoped.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Perfil QA en el tablero de Tareas: ve solo sus tarjetas, reporta en "QA / Reportes", no
// mueve ni edita. Un admin o developer que ademas tenga QA trabaja normalmente.
export function isQaRestricted(user: RoleHolder): boolean {
  return roleCodesOf(user).includes(QA_ROLE) && scopedPathsFor(user) !== null;
}
