// Roles iniciales del sistema (ver README para como agregar uno nuevo sin migrar el schema:
// Role.code es un string unico en la base, no un enum de Prisma, para poder sumar roles a futuro
// (ej: "viewer") con solo un insert/seed, sin generar una migracion nueva).
export const ROLE_CODES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  TESTER: 'tester',
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];
