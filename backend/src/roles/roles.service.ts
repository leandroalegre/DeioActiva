import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ROLE_NAMES, RoleCode } from '../common/constants/roles.constant';

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Asegura que cada rol definido en ROLE_CODES exista en la base. Solo crea los que faltan
  // (no renombra ni toca los existentes), asi un rol nuevo como "reuniones" queda disponible
  // en produccion con solo desplegar, sin tener que correr el seed completo.
  async onModuleInit() {
    try {
      for (const [code, name] of Object.entries(ROLE_NAMES) as [RoleCode, string][]) {
        const existing = await this.prisma.role.findUnique({ where: { code } });
        if (!existing) {
          await this.prisma.role.create({ data: { code, name } });
          this.logger.log(`Rol "${code}" creado automaticamente.`);
        }
      }
    } catch (err) {
      // No se bloquea el arranque por esto: si falla (ej. base todavia sin tablas), el seed
      // sigue siendo la via manual para crear los roles.
      this.logger.warn(`No se pudieron verificar los roles base: ${(err as Error).message}`);
    }
  }

  findAll() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }
}
