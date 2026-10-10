import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  HistoryAction,
  Prisma,
  WorkItemArea,
  WorkItemPriority,
  WorkItemStatus,
  WorkItemType,
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { HistoryService } from '../history/history.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { QueryWorkItemsDto } from './dto/query-work-items.dto';
import { PaginatedResult } from '../common/dto/pagination-query.dto';
import { syncMeetingPointsWithWorkItem } from '../meetings/meeting-point-sync';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { isQaRestricted } from '../common/constants/roles.constant';
import { NotificationsService } from '../notifications/notifications.service';

// Modulo donde caen los reportes QA que no indican modulo. Se crea la primera vez que hace falta.
const QA_MODULE_SLUG = 'reportes-qa';
const QA_MODULE_NAME = 'Reportes QA';

const INCLUDE = {
  module: { select: { id: true, name: true, slug: true } },
  assignedTo: { select: { id: true, fullName: true, email: true } },
  createdBy: { select: { id: true, fullName: true, email: true } },
  milestone: { select: { id: true, name: true } },
  _count: { select: { comments: true } },
  checklistItems: { orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }] },
  // Solo metadatos: el contenido (data) se sirve aparte en GET .../attachments/:id.
  attachments: {
    select: { id: true, fileName: true, mimeType: true, size: true, createdAt: true },
    orderBy: { createdAt: 'asc' as const },
  },
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
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(
    query: QueryWorkItemsDto,
    user?: AuthenticatedUser,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where = {
      moduleId: query.moduleId,
      assignedToId: query.assignedToId,
      status: query.status,
      type: query.type,
      priority: query.priority,
      // El perfil QA ve todas las columnas, pero solo con las tarjetas que cargo el mismo.
      ...(isQaRestricted(user) ? { createdById: user!.id } : {}),
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

  async findOne(id: string, user?: AuthenticatedUser) {
    const workItem = await this.prisma.workItem.findUnique({ where: { id }, include: INCLUDE });
    // A un usuario QA, una tarjeta ajena le responde igual que una inexistente.
    if (!workItem || (isQaRestricted(user) && workItem.createdById !== user!.id)) {
      throw new NotFoundException('Tarea no encontrada');
    }
    return workItem;
  }

  private async qaModuleId(createdById: string): Promise<string> {
    const existing = await this.prisma.module.findUnique({ where: { slug: QA_MODULE_SLUG } });
    if (existing) return existing.id;
    const created = await this.prisma.module.create({
      data: {
        name: QA_MODULE_NAME,
        slug: QA_MODULE_SLUG,
        description: 'Reportes cargados por QA sin modulo asignado. Reasignar al hacer el triage.',
        order: 999,
        createdById,
      },
    });
    return created.id;
  }

  async create(dto: CreateWorkItemDto, user: AuthenticatedUser) {
    const createdById = user.id;
    const qa = isQaRestricted(user);

    if (!dto.moduleId && !qa) {
      throw new BadRequestException('Elegí un módulo para la tarea');
    }
    const moduleId = dto.moduleId ?? (await this.qaModuleId(createdById));

    // Un reporte QA siempre entra en la columna "QA / Reportes", como Error, con prioridad
    // Media: el equipo decide la prioridad real, el estado y a quien se asigna al hacer el
    // triage. Lo que mande el formulario para esos campos se ignora.
    const data: Prisma.WorkItemUncheckedCreateInput = qa
      ? {
          moduleId,
          type: WorkItemType.ERROR,
          area: WorkItemArea.FULLSTACK,
          status: WorkItemStatus.QA_REPORT,
          title: dto.title,
          description: dto.description,
          priority: WorkItemPriority.MEDIUM,
          establishment: dto.establishment?.trim() || null,
          suggestedPriority: dto.suggestedPriority,
          createdById,
        }
      : {
          moduleId,
          type: dto.type,
          area: dto.area ?? WorkItemArea.FULLSTACK,
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
          establishment: dto.establishment?.trim() || undefined,
          suggestedPriority: dto.suggestedPriority,
          createdById,
        };

    const workItem = await this.prisma.workItem.create({
      data: {
        ...data,
        checklistItems: {
          create: (dto.checklist ?? [])
            .map((text) => text.trim())
            .filter((text) => text.length > 0)
            .map((text, position) => ({ text, position })),
        },
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
        ...(plannedStart !== undefined
          ? { plannedStart: toDateOrUndefined(plannedStart) ?? null }
          : {}),
        ...(plannedEnd !== undefined ? { plannedEnd: toDateOrUndefined(plannedEnd) ?? null } : {}),
        ...(dueDate !== undefined ? { dueDate: toDateOrUndefined(dueDate) ?? null } : {}),
        ...(actualStart !== undefined
          ? { actualStart: toDateOrUndefined(actualStart) ?? null }
          : {}),
        ...(actualEnd !== undefined ? { actualEnd: toDateOrUndefined(actualEnd) ?? null } : {}),
      },
      include: INCLUDE,
    });

    const statusChanged = dto.status && dto.status !== before.status;
    const areaChanged = dto.area && dto.area !== before.area;

    // Si la tarea salio de un punto de reunion, el punto acompaña el estado de la tarea
    // (Completada -> Resuelto, Descartada -> Descartado, etc.). Ver meeting-point-sync.ts.
    if (statusChanged) {
      await syncMeetingPointsWithWorkItem(this.prisma, id, workItem.status, userId);
    }

    // Si la reporto alguien de QA y llego a Completado, se le avisa para que valide la correccion.
    if (statusChanged && workItem.status === WorkItemStatus.COMPLETED) {
      await this.notifications.notifyQaReporterOfCompletion(workItem, userId);
    }

    await this.history.record({
      workItemId: id,
      userId,
      action: statusChanged ? HistoryAction.STATUS_CHANGED : HistoryAction.UPDATED,
      beforeJson: before as unknown as Prisma.InputJsonValue,
      afterJson: workItem as unknown as Prisma.InputJsonValue,
    });

    if (areaChanged) {
      await this.history.record({
        workItemId: id,
        userId,
        action: HistoryAction.AREA_CHANGED,
        beforeJson: before as unknown as Prisma.InputJsonValue,
        afterJson: workItem as unknown as Prisma.InputJsonValue,
      });
    }

    return workItem;
  }

  // Borrado definitivo (a pedido: antes la unica forma de "sacar" una tarea era moverla a
  // DISCARDED, que la deja visible en el Kanban para siempre). Los comentarios y el historial
  // de la tarea tienen onDelete: Cascade en el schema, asi que se limpian solos.
  async remove(id: string) {
    await this.findOne(id);
    // Tablas MyISAM (sin foreign keys): los onDelete del schema no se aplican, asi que se
    // limpian a mano los comentarios/historial/checklist/imagenes y se desvinculan los puntos de reunion.
    await this.prisma.$transaction([
      this.prisma.meetingPoint.updateMany({
        where: { workItemId: id },
        data: { workItemId: null },
      }),
      this.prisma.workItemComment.deleteMany({ where: { workItemId: id } }),
      this.prisma.workItemHistory.deleteMany({ where: { workItemId: id } }),
      this.prisma.workItemChecklistItem.deleteMany({ where: { workItemId: id } }),
      this.prisma.workItemAttachment.deleteMany({ where: { workItemId: id } }),
      this.prisma.notification.deleteMany({ where: { workItemId: id } }),
      this.prisma.workItem.delete({ where: { id } }),
    ]);
  }
}
