// Codigos de rol usados en el frontend (espejo de backend/src/common/constants/roles.constant.ts).
export const ADMIN_ROLES = ['super_admin', 'admin'];

// Pueden crear/editar/eliminar reuniones y sus puntos.
export const MEETING_MANAGER_ROLES = ['super_admin', 'admin', 'reuniones'];

// Roles acotados: solo ven las rutas listadas y su "home" es la primera. El backend aplica
// la misma restriccion (RolesGuard + @ScopedRolesAllowed), esto es solo la parte visual.
export const SCOPED_ROLE_PATHS: Record<string, string[]> = {
  reuniones: ['/reuniones'],
};

export function scopedPathsFor(roleCode?: string | null): string[] | null {
  if (!roleCode) return null;
  return SCOPED_ROLE_PATHS[roleCode] ?? null;
}

export function isPathAllowedFor(roleCode: string | undefined | null, pathname: string): boolean {
  const scoped = scopedPathsFor(roleCode);
  if (!scoped) return true;
  return scoped.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
