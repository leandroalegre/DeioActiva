import { Injectable, NotFoundException } from '@nestjs/common';
import { HistoryAction, Prisma, WorkItemPriority } from '@prisma/client';
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
  milestone: { select: { id: true, name: true } },
  _count: { select: { comments: true } },
};

// Convierte un string "YYYY-MM-DD" (o ISO completo) que llega de un <input type="date">
// a un Date real. Prisma/MySQL rechazan un DateTime armado a mano con el string "corto"
// (era la causa del 500 "No se pudo crear la tarea"/"No se pudo guardar el hito").
function toDateOrUndefined(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

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
        priority: dto.priority ?? WorkItemPriority.MEDIUM,
        assignedToId: dto.assignedToId,
        plannedStart: toDateOrUndefined(dto.plannedStart),
        plannedEnd: toDateOrUndefined(dto.plannedEnd),
        dueDate: toDateOrUndefined(dto.dueDate),
        progressPercentage: dto.progressPercentage ?? 0,
        versionTarget: dto.versionTarget,
        milestoneId: dto.milestoneId,
        createdById,
      },
      include: INCLUDE,
    });

    await this.history.record({
      workItemId: workItem.id,
      userId: createdById,
      action: HistoryAction.CREATED,
      afterJson: workItem as unknown as Prisma.InputJsonValue,
    });

    return workItem;
  }

  async update(id: string, dto: UpdateWorkItemDto, userId: string) {
    const before = await this.findOne(id);

    const { plannedStart, plannedEnd, dueDate, actualStart, actualEnd, ...rest } = dto;

    const workItem = await this.prisma.workItem.update({
      where: { id },
      data: {
        ...rest,
        ...(plannedStart !== undefined ? { plannedStart: toDateOrUndefined(plannedStart) ?? null } : {}),
        ...(plannedEnd !== undefined ? { plannedEnd: toDateOrUndefined(plannedEnd) ?? null } : {}),
        ...(dueDate !== undefined ? { dueDate: toDateOrUndefined(dueDate) ?? null } : {}),
        ...(actualStart !== undefined ? { actualStart: toDateOrUndefined(actualStart) ?? null } : {}),
        ...(actualEnd !== undefined ? { actualEnd: toDateOrUndefined(actualEnd) ?? null } : {}),
      },
      include: INCLUDE,
    });

    const statusChanged = dto.status && dto.status !== before.status;

    await this.history.record({
      workItemId: id,
      userId,
      action: statusChanged ? HistoryAction.STATUS_CHANGED : HistoryAction.UPDATED,
      beforeJson: before as unknown as Prisma.InputJsonValue,
      afterJson: workItem as unknown as Prisma.InputJsonValue,
    });

    return workItem;
  }

  // Borrado definitivo (a pedido: antes la unica forma de "sacar" una tarea era moverla a
  // DISCARDED, que la deja visible en el Kanban para siempre). Los comentarios y el historial
  // de la tarea tienen onDelete: Cascade en el schema, asi que se limpian solos.
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.workItem.delete({ where: { id } });
  }
}
