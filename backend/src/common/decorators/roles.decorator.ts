import { SetMetadata } from '@nestjs/common';
import { ROLE_CODES, RoleCode } from '../constants/roles.constant';

export const ROLES_KEY = 'roles';

/**
 * Restringe un endpoint a uno o mas codigos de rol.
 * Uso: @Roles('super_admin', 'admin')
 */
export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);

export const AllRoles = Object.values(ROLE_CODES);
