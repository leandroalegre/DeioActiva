import { SetMetadata } from '@nestjs/common';
import { ROLE_CODES, RoleCode } from '../constants/roles.constant';

export const ROLES_KEY = 'roles';

/**
 * Restringe un endpoint a uno o mas codigos de rol.
 * Uso: @Roles('super_admin', 'admin')
 */
export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);

export const AllRoles = Object.values(ROLE_CODES);

export const SCOPED_ROLES_ALLOWED_KEY = 'scopedRolesAllowed';

/**
 * Habilita un endpoint (o un controller entero) para roles acotados (SCOPED_ROLE_CODES),
 * que por defecto no pueden usar ningun endpoint. Ej: @ScopedRolesAllowed('reuniones').
 */
export const ScopedRolesAllowed = (...roles: RoleCode[]) =>
  SetMetadata(SCOPED_ROLES_ALLOWED_KEY, roles);
