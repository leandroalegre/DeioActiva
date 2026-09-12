import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { PaginatedResult, PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.milestone.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.milestone.count(),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(id: string) {
    const milestone = await this.prisma.milestone.findUnique({ where: { id } });
    if (!milestone) {
      throw new NotFoundException('Hito no encontrado');
    }
    return milestone;
  }

  create(dto: CreateMilestoneDto, createdById: string) {
    return this.prisma.milestone.create({
      data: {
        name: dto.name,
        description: dto.description,
        // dto.dueDate llega como string "YYYY-MM-DD" (IsDateString) desde un <input type="date">.
        // Prisma/MySQL necesitan un Date real (o un ISO-8601 con hora) para una columna DateTime;
        // pasar el string "corto" tal cual rompe el insert con un 500 generico.
        dueDate: new Date(dto.dueDate),
        status: dto.status,
        createdById,
      },
    });
  }

  async update(id: string, dto: UpdateMilestoneDto) {
    await this.findOne(id);
    const { dueDate, ...rest } = dto;
    return this.prisma.milestone.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate !== undefined ? { dueDate: new Date(dueDate) } : {}),
      },
    });
  }
}
