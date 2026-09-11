import { Injectable, NotFoundException } from '@nestjs/common';
import { HistoryAction } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { HistoryService } from '../history/history.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { QueryWorkItemsDto } from './dto/query-work-items.dto';
import { PaginatedResult } from '../common/dto/pagination-query.dto';

const INCLUDE = {
  module: { select: { id: true, name: true, slug: true } },
  assignedTo: { select: { id: true, fullName: true, email: true } },
  createdBy: { select: { id: true, fullName: true, email: true } },
};

@Injectable()
export class WorkItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  async findAll(query: QueryWorkItemsDto): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where = {
      moduleId: query.moduleId,
      assignedToId: query.assignedToId,
      status: query.status,
      type: query.type,
      priority: query.priority,
    };
    // Prisma ignora las claves con valor undefined, asi que no hace falta armar el objeto a mano.

    const [data, total] = await Promise.all([
      this.prisma.workItem.findMany({
        where,
        include: INCLUDE,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workItem.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(id: string) {
    const workItem = await this.prisma.workItem.findUnique({ where: { id }, include: INCLUDE });
    if (!workItem) {
      throw new NotFoundException('Tarea no encontrada');
    }
    return workItem;
  }

  async create(dto: CreateWorkItemDto, createdById: string) {
    const workItem = await this.prisma.workItem.create({
      data: {
        moduleId: dto.moduleId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        assignedToId: dto.assignedToId,
        plannedStart: dto.plannedStart,
        plannedEnd: dto.plannedEnd,
        dueDate: dto.dueDate,
        progressPercentage: dto.progressPercentage ?? 0,
        versionTarget: dto.versionTarget,
        createdById,
      },
      include: INCLUDE,
    });

    await this.history.record({
      workItemId: workItem.id,
      userId: createdById,
      action: HistoryAction.CREATED,
      afterJson: workItem as unknown as Record<string, unknown>,
    });

    return workItem;
  }

  async update(id: string, dto: UpdateWorkItemDto, userId: string) {
    const before = await this.findOne(id);

    const workItem = await this.prisma.workItem.update({
      where: { id },
      data: dto,
      include: INCLUDE,
    });

    const statusChanged = dto.status && dto.status !== before.status;

    await this.history.record({
      workItemId: id,
      userId,
      action: statusChanged ? HistoryAction.STATUS_CHANGED : HistoryAction.UPDATED,
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: workItem as unknown as Record<string, unknown>,
    });

    return workItem;
  }
}
