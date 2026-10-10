export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  // Rol principal.
  role: {
    id: string;
    code: string;
    name: string;
  };
  // Roles adicionales (UserAdditionalRole), ej. "qa" sumado a "reuniones".
  additionalRoles: { id: string; code: string; name: string }[];
  // Codigos de todos los roles (principal + adicionales). Es lo que usa el RolesGuard.
  roles: string[];
}

type RoleRow = { id: string; code: string; name: string };

// Arma el usuario autenticado a partir de un User de Prisma con role y additionalRoles.role.
export function toAuthenticatedUser(user: {
  id: string;
  email: string;
  fullName: string;
  role: RoleRow;
  additionalRoles?: { role: RoleRow }[];
}): AuthenticatedUser {
  const role = { id: user.role.id, code: user.role.code, name: user.role.name };
  const additionalRoles = (user.additionalRoles ?? [])
    .map(({ role: r }) => ({ id: r.id, code: r.code, name: r.name }))
    .filter((r) => r.code !== role.code);
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role,
    additionalRoles,
    roles: [role.code, ...additionalRoles.map((r) => r.code)],
  };
}

// include de Prisma para traer lo que necesita toAuthenticatedUser.
export const AUTH_USER_INCLUDE = {
  role: true,
  additionalRoles: { include: { role: true } },
} as const;
