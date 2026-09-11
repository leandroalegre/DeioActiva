import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleCode, ROLE_CODES } from '../constants/roles.constant';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard RBAC centralizado. En vez de repetir "if (user.role !== X)" en cada controller,
 * los endpoints se anotan con @Roles('admin', 'developer') y este guard hace la unica
 * verificacion, en un solo lugar, para todo el backend.
 *
 * super_admin siempre pasa, sin importar los roles listados en @Roles(...).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<RoleCode[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sin @Roles(...) en el endpoint: solo se exige estar autenticado (ya lo garantiza JwtAuthGuard).
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.role?.code) {
      throw new ForbiddenException('El usuario no tiene un rol asignado');
    }

    if (user.role.code === ROLE_CODES.SUPER_ADMIN) {
      return true;
    }

    if (!requiredRoles.includes(user.role.code)) {
      throw new ForbiddenException('No tenes permisos para realizar esta accion');
    }

    return true;
  }
}
