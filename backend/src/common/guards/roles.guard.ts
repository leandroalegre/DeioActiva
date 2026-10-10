import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, SCOPED_ROLES_ALLOWED_KEY } from '../decorators/roles.decorator';
import { isScopedUser, RoleCode, ROLE_CODES } from '../constants/roles.constant';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard RBAC centralizado. En vez de repetir "if (user.role !== X)" en cada controller,
 * los endpoints se anotan con @Roles('admin', 'developer') y este guard hace la unica
 * verificacion, en un solo lugar, para todo el backend.
 *
 * super_admin siempre pasa, sin importar los roles listados en @Roles(...).
 *
 * Roles acotados (ej. "reuniones"): solo pasan en endpoints marcados con
 * @ScopedRolesAllowed(...) que los incluyan; en cualquier otro endpoint se rechazan, aunque
 * no tenga @Roles(...). Asi un perfil de Reuniones no puede leer ni tocar tareas/modulos
 * llamando a la API directamente.
 *
 * Un usuario puede tener roles adicionales (user.roles = principal + adicionales): alcanza con
 * que uno de ellos este habilitado. Si alguno de sus roles es completo, no se lo trata como
 * acotado.
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

    const request = context.switchToHttp().getRequest();
    const user = request.user as { roles?: string[]; role?: { code?: string } } | undefined;
    const userRoles: string[] = user?.roles ?? (user?.role?.code ? [user.role.code] : []);

    if (isScopedUser({ roles: userRoles })) {
      const allowedScoped =
        this.reflector.getAllAndOverride<RoleCode[]>(SCOPED_ROLES_ALLOWED_KEY, [
          context.getHandler(),
          context.getClass(),
        ]) ?? [];
      if (!userRoles.some((code) => allowedScoped.includes(code as RoleCode))) {
        throw new ForbiddenException('Tu perfil no tiene acceso a esta seccion');
      }
    }

    // Sin @Roles(...) en el endpoint: solo se exige estar autenticado (ya lo garantiza JwtAuthGuard).
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (userRoles.length === 0) {
      throw new ForbiddenException('El usuario no tiene un rol asignado');
    }

    if (userRoles.includes(ROLE_CODES.SUPER_ADMIN)) {
      return true;
    }

    if (!userRoles.some((code) => requiredRoles.includes(code as RoleCode))) {
      throw new ForbiddenException('No tenes permisos para realizar esta accion');
    }

    return true;
  }
}
