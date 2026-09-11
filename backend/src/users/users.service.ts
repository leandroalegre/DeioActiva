import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
  role: { select: { id: true, code: true, name: true } },
};

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

    return { data, total, page, pageSize };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        roleId: dto.roleId,
        active: dto.active ?? true,
      },
      select: SAFE_SELECT,
    });
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = {
      fullName: dto.fullName,
      roleId: dto.roleId,
      active: dto.active,
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: SAFE_SELECT,
    });
    return user;
  }
}
