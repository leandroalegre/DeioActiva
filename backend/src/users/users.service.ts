import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedResult, PaginationQueryDto } from '../common/dto/pagination-query.dto';

const SAFE_SELECT = {
  id: true,
  email: true,
  fullName: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  role: { select: { id: true, code: true, name: true } },
  additionalRoles: { select: { role: { select: { id: true, code: true, name: true } } } },
};

type UserRow = {
  additionalRoles: { role: { id: string; code: string; name: string } }[];
};

// Aplana additionalRoles a [{id, code, name}] para el frontend.
function toUserView<T extends UserRow>(user: T) {
  const { additionalRoles, ...rest } = user;
  return {
    ...(rest as Omit<T, 'additionalRoles'>),
    additionalRoles: additionalRoles.map((r) => r.role),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        select: SAFE_SELECT,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return { data: data.map(toUserView), total, page, pageSize };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return toUserView(user);
  }

  // Valida los roles adicionales: que existan y saca el principal si vino repetido.
  private async normalizeAdditionalRoles(roleId: string, ids: string[]): Promise<string[]> {
    const unique = [...new Set(ids)].filter((id) => id !== roleId);
    if (unique.length === 0) return [];
    const found = await this.prisma.role.count({ where: { id: { in: unique } } });
    if (found !== unique.length) {
      throw new BadRequestException('Alguno de los roles adicionales no existe');
    }
    return unique;
  }

  private async replaceAdditionalRoles(userId: string, roleIds: string[]) {
    // Tablas MyISAM (sin foreign keys ni transacciones reales): se borra y se vuelve a crear.
    await this.prisma.userAdditionalRole.deleteMany({ where: { userId } });
    if (roleIds.length > 0) {
      await this.prisma.userAdditionalRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      });
    }
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const additionalRoleIds = await this.normalizeAdditionalRoles(
      dto.roleId,
      dto.additionalRoleIds ?? [],
    );
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        roleId: dto.roleId,
        active: dto.active ?? true,
      },
      select: { id: true },
    });
    await this.replaceAdditionalRoles(created.id, additionalRoleIds);
    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateUserDto) {
    const current = await this.findOne(id);

    const data: Record<string, unknown> = {
      fullName: dto.fullName,
      roleId: dto.roleId,
      active: dto.active,
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.prisma.user.update({ where: { id }, data, select: { id: true } });

    const primaryRoleId = dto.roleId ?? current.role.id;
    if (dto.additionalRoleIds !== undefined) {
      await this.replaceAdditionalRoles(
        id,
        await this.normalizeAdditionalRoles(primaryRoleId, dto.additionalRoleIds),
      );
    } else if (dto.roleId && current.additionalRoles.some((r) => r.id === dto.roleId)) {
      // El nuevo rol principal estaba como adicional: se saca para no tenerlo dos veces.
      await this.prisma.userAdditionalRole.deleteMany({
        where: { userId: id, roleId: dto.roleId },
      });
    }
    return this.findOne(id);
  }
}
