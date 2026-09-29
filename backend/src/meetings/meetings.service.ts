import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HistoryAction,
  MeetingFrequency,
  MeetingPointStatus,
  MeetingPointType,
  MeetingStatus,
  Prisma,
  WorkItemPriority,
  WorkItemType,
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { HistoryService } from '../history/history.service';
import { PaginatedResult } from '../common/dto/pagination-query.dto';
import {
  CreateMeetingDto,
  FinishMeetingDto,
  MeetingParticipantInputDto,
  QueryMeetingsDto,
  UpdateAttendanceDto,
  UpdateMeetingDto,
} from './dto/meeting.dto';
import {
  CreateMeetingPointDto,
  CreatePointNoteDto,
  CreateWorkItemFromPointDto,
  QueryPendingPointsDto,
  UpdateMeetingPointDto,
} from './dto/meeting-point.dto';

const USER_SELECT = { select: { id: true, fullName: true, email: true } };

// Estados de un punto que se consideran "abiertos" (se pueden arrastrar a la proxima
// reunion y aparecen en el listado de pendientes).
const OPEN_POINT_STATUSES: MeetingPointStatus[] = [
  MeetingPointStatus.PENDING,
  MeetingPointStatus.IN_PROGRESS,
  MeetingPointStatus.POSTPONED,
];

const POINT_INCLUDE = {
  responsible: USER_SELECT,
  workItem: { select: { id: true, title: true, status: true } },
  carriedFrom: {
    select: { id: true, meeting: { select: { id: true, title: true, date: true } } },
  },
  carriedTo: {
    select: { id: true, meeting: { select: { id: true, title: true, date: true } } },
  },
  notes: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: USER_SELECT },
  },
} satisfies Prisma.MeetingPointInclude;

const MEETING_DETAIL_INCLUDE = {
  createdBy: USER_SELECT,
  participants: {
    orderBy: { createdAt: 'asc' as const },
    include: { user: USER_SELECT },
  },
  points: { orderBy: { order: 'asc' as const }, include: POINT_INCLUDE },
  previousMeeting: { select: { id: true, title: true, date: true } },
  nextMeetings: { select: { id: true, title: true, date: true } },
} satisfies Prisma.MeetingInclude;

// "YYYY-MM-DD" (o ISO) -> Date. Las fechas "solo dia" quedan a medianoche UTC, igual que en
// hitos/tareas, y el frontend las formatea con timeZone UTC.
function toDate(value: string): Date {
  return new Date(value);
}

// Para PATCH: undefined = no tocar, null/"" = limpiar, string = nueva fecha.
function toNullableDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value) : null;
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  // ---------------------------------------------------------------- opciones de formularios

  // Usuarios y modulos activos para los combos de participantes/responsables y de "crear
  // tarea desde un punto". Se expone aca (y no via /users o /modules) porque esos endpoints
  // no estan habilitados para el perfil acotado de Reuniones.
  async options() {
    const [users, modules] = await Promise.all([
      this.prisma.user.findMany({
        where: { active: true },
        select: { id: true, fullName: true, email: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.module.findMany({
        where: { active: true },
        select: { id: true, name: true, parentId: true },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      }),
    ]);
    return { users, modules };
  }

  // ---------------------------------------------------------------- reuniones

  async findAll(query: QueryMeetingsDto): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const when = query.when ?? 'all';
    const today = startOfTodayUtc();

    const where: Prisma.MeetingWhereInput = {
      status: query.status,
      ...(when === 'upcoming' ? { date: { gte: today } } : {}),
      ...(when === 'past' ? { date: { lt: today } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { area: { contains: query.search } },
              { description: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.meeting.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy:
          when === 'upcoming'
            ? [{ date: 'asc' }, { startTime: 'asc' }]
            : [{ date: 'desc' }, { startTime: 'desc' }],
        include: {
          participants: { select: { id: true, name: true, attended: true, userId: true } },
          points: { select: { status: true, dueDate: true } },
        },
      }),
      this.prisma.meeting.count({ where }),
    ]);

    // Se devuelven contadores en vez de los puntos completos: la tarjeta del listado solo
    // necesita "X puntos, Y resueltos, Z vencidos".
    const data = rows.map(({ points, ...meeting }) => ({
      ...meeting,
      pointsSummary: {
        total: points.length,
        resolved: points.filter((p) => p.status === MeetingPointStatus.RESOLVED).length,
        open: points.filter((p) => OPEN_POINT_STATUSES.includes(p.status)).length,
        overdue: points.filter(
          (p) => OPEN_POINT_STATUSES.includes(p.status) && p.dueDate && p.dueDate < today,
        ).length,
      },
    }));

    return { data, total, page, pageSize };
  }

  async findOne(id: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: MEETING_DETAIL_INCLUDE,
    });
    if (!meeting) {
      throw new NotFoundException('Reunión no encontrada');
    }
    return meeting;
  }

  private async buildParticipants(participants: MeetingParticipantInputDto[]) {
    const userIds = participants.map((p) => p.userId).filter((v): v is string => Boolean(v));
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    const seenUsers = new Set<string>();
    const result: { userId: string | null; name: string }[] = [];
    for (const p of participants) {
      if (p.userId) {
        const user = userById.get(p.userId);
        if (!user) throw new BadRequestException('Uno de los participantes no existe');
        if (seenUsers.has(user.id)) continue;
        seenUsers.add(user.id);
        result.push({ userId: user.id, name: user.fullName });
      } else {
        const name = p.name?.trim();
        if (!name) throw new BadRequestException('Cada participante externo necesita un nombre');
        result.push({ userId: null, name });
      }
    }
    return result;
  }

  private pointCreateData(dto: CreateMeetingPointDto, order: number) {
    return {
      order,
      title: dto.title.trim(),
      description: dto.description || null,
      type: dto.type ?? MeetingPointType.TOPIC,
      status: dto.status ?? MeetingPointStatus.PENDING,
      resolution: dto.resolution || null,
      responsibleId: dto.responsibleId || null,
      dueDate: dto.dueDate ? toDate(dto.dueDate) : null,
    };
  }

  async create(dto: CreateMeetingDto, createdById: string) {
    if (!dto.title?.trim()) throw new BadRequestException('El título es obligatorio');
    const participants = await this.buildParticipants(dto.participants ?? []);

    if (dto.previousMeetingId) {
      await this.ensureExists(dto.previousMeetingId);
    }

    const meeting = await this.prisma.meeting.create({
      data: {
        title: dto.title.trim(),
        area: dto.area || null,
        description: dto.description || null,
        location: dto.location || null,
        date: toDate(dto.date),
        startTime: dto.startTime || null,
        endTime: dto.endTime || null,
        frequency: dto.frequency ?? MeetingFrequency.UNIQUE,
        status: dto.status ?? MeetingStatus.SCHEDULED,
        previousMeetingId: dto.previousMeetingId || null,
        createdById,
        participants: { create: participants },
        points: { create: (dto.points ?? []).map((p, i) => this.pointCreateData(p, i + 1)) },
      },
    });

    if (dto.previousMeetingId && dto.carryOverPending) {
      await this.carryOver(meeting.id, dto.previousMeetingId);
    }

    return this.findOne(meeting.id);
  }

  async update(id: string, dto: UpdateMeetingDto) {
    const existing = await this.ensureExists(id);
    // "points" y "carryOverPending" solo aplican al alta: los puntos se editan con sus
    // propios endpoints y el arrastre de pendientes con POST /meetings/:id/carry-over.
    const { participants, previousMeetingId } = dto;

    if (previousMeetingId === id) {
      throw new BadRequestException('Una reunión no puede ser su propia reunión anterior');
    }

    // undefined = no tocar; null o "" en campos opcionales = limpiar.
    const optionalText = (v: string | null | undefined) =>
      v === undefined ? undefined : v || null;
    const data: Prisma.MeetingUncheckedUpdateInput = {
      title: dto.title !== undefined ? dto.title.trim() : undefined,
      area: optionalText(dto.area),
      description: optionalText(dto.description),
      location: optionalText(dto.location),
      date: dto.date !== undefined ? toDate(dto.date) : undefined,
      startTime: optionalText(dto.startTime),
      endTime: optionalText(dto.endTime),
      frequency: dto.frequency,
      status: dto.status,
      minutesNotes: optionalText(dto.minutesNotes),
      previousMeetingId: optionalText(previousMeetingId),
    };
    if (dto.status !== undefined && dto.status !== existing.status) {
      data.finishedAt = dto.status === MeetingStatus.FINISHED ? new Date() : null;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.meeting.update({ where: { id }, data });

      if (participants !== undefined) {
        // Se sincroniza la lista conservando la asistencia ya registrada de quienes siguen.
        const wanted = await this.buildParticipants(participants);
        const current = await tx.meetingParticipant.findMany({ where: { meetingId: id } });
        const key = (p: { userId: string | null; name: string }) =>
          p.userId ? `u:${p.userId}` : `n:${p.name.toLowerCase()}`;
        const wantedKeys = new Set(wanted.map(key));
        const currentKeys = new Set(current.map(key));

        const toDelete = current.filter((p) => !wantedKeys.has(key(p))).map((p) => p.id);
        if (toDelete.length) {
          await tx.meetingParticipant.deleteMany({ where: { id: { in: toDelete } } });
        }
        const toCreate = wanted.filter((p) => !currentKeys.has(key(p)));
        if (toCreate.length) {
          await tx.meetingParticipant.createMany({
            data: toCreate.map((p) => ({ ...p, meetingId: id })),
          });
        }
      }
    });

    return this.findOne(id);
  }

  async finish(id: string, dto: FinishMeetingDto) {
    const meeting = await this.ensureExists(id);
    if (meeting.status === MeetingStatus.CANCELLED) {
      throw new ConflictException('No se puede finalizar una reunión cancelada');
    }
    await this.prisma.meeting.update({
      where: { id },
      data: {
        status: MeetingStatus.FINISHED,
        // Si ya estaba finalizada (ej. solo se editan las observaciones) se conserva la fecha.
        finishedAt: meeting.finishedAt ?? new Date(),
        ...(dto.minutesNotes !== undefined ? { minutesNotes: dto.minutesNotes } : {}),
      },
    });
    return this.findOne(id);
  }

  async updateAttendance(id: string, dto: UpdateAttendanceDto) {
    await this.ensureExists(id);
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.meetingParticipant.updateMany({
          where: { id: item.participantId, meetingId: id },
          data: { attended: item.attended ?? null },
        }),
      ),
    );
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // Los puntos que otras reuniones trajeron desde esta quedan sin origen (SetNull), y las
    // reuniones siguientes de la serie quedan sin "anterior": no se borra nada en cascada
    // fuera de esta reunion (sus participantes, puntos y notas si se borran).
    await this.prisma.meeting.delete({ where: { id } });
  }

  // Trae a "targetId" una copia de cada punto abierto de "fromId" que todavia no se haya
  // trasladado. El punto original queda como estaba, enlazado al nuevo (carriedTo), asi el
  // historial de la reunion anterior no se pierde.
  async carryOver(targetId: string, fromId: string) {
    if (targetId === fromId) {
      throw new BadRequestException('Elegí una reunión distinta de la actual');
    }
    await this.ensureExists(targetId);
    await this.ensureExists(fromId);

    const openPoints = await this.prisma.meetingPoint.findMany({
      where: { meetingId: fromId, status: { in: OPEN_POINT_STATUSES }, carriedTo: { is: null } },
      orderBy: { order: 'asc' },
    });

    const last = await this.prisma.meetingPoint.aggregate({
      where: { meetingId: targetId },
      _max: { order: true },
    });
    let order = last._max.order ?? 0;

    await this.prisma.$transaction([
      ...openPoints.map((p) =>
        this.prisma.meetingPoint.create({
          data: {
            meetingId: targetId,
            order: ++order,
            title: p.title,
            description: p.description,
            type: p.type,
            status:
              p.status === MeetingPointStatus.IN_PROGRESS ? p.status : MeetingPointStatus.PENDING,
            resolution: p.resolution,
            responsibleId: p.responsibleId,
            dueDate: p.dueDate,
            workItemId: p.workItemId,
            carriedFromId: p.id,
          },
        }),
      ),
      this.prisma.meeting.update({
        where: { id: targetId },
        data: { previousMeetingId: fromId },
      }),
    ]);

    return { carried: openPoints.length, meeting: await this.findOne(targetId) };
  }

  private async ensureExists(id: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    return meeting;
  }

  // ---------------------------------------------------------------- puntos

  async createPoint(meetingId: string, dto: CreateMeetingPointDto) {
    await this.ensureExists(meetingId);
    if (!dto.title?.trim()) throw new BadRequestException('El punto necesita un título');
    const last = await this.prisma.meetingPoint.aggregate({
      where: { meetingId },
      _max: { order: true },
    });
    return this.prisma.meetingPoint.create({
      data: { meetingId, ...this.pointCreateData(dto, (last._max.order ?? 0) + 1) },
      include: POINT_INCLUDE,
    });
  }

  async updatePoint(pointId: string, dto: UpdateMeetingPointDto) {
    await this.ensurePoint(pointId);
    const { dueDate, title, responsibleId, description, resolution, ...rest } = dto;
    return this.prisma.meetingPoint.update({
      where: { id: pointId },
      data: {
        ...rest,
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(resolution !== undefined ? { resolution: resolution || null } : {}),
        ...(responsibleId !== undefined ? { responsibleId: responsibleId || null } : {}),
        ...(dueDate !== undefined ? { dueDate: toNullableDate(dueDate) } : {}),
      },
      include: POINT_INCLUDE,
    });
  }

  async removePoint(pointId: string) {
    await this.ensurePoint(pointId);
    await this.prisma.meetingPoint.delete({ where: { id: pointId } });
  }

  async reorderPoints(meetingId: string, pointIds: string[]) {
    await this.ensureExists(meetingId);
    const existing = await this.prisma.meetingPoint.findMany({
      where: { meetingId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((p) => p.id));
    if (pointIds.length !== existingIds.size || pointIds.some((id) => !existingIds.has(id))) {
      throw new BadRequestException('La lista de puntos no coincide con los de la reunión');
    }
    await this.prisma.$transaction(
      pointIds.map((id, i) =>
        this.prisma.meetingPoint.update({ where: { id }, data: { order: i + 1 } }),
      ),
    );
    return this.findOne(meetingId);
  }

  async addNote(pointId: string, dto: CreatePointNoteDto, authorId: string) {
    await this.ensurePoint(pointId);
    const text = dto.text.trim();
    if (!text) throw new BadRequestException('El avance no puede estar vacío');
    return this.prisma.meetingPointNote.create({
      data: { pointId, authorId, text },
      include: { author: USER_SELECT },
    });
  }

  // Puntos abiertos de todas las reuniones (no trasladados), para el tablero de pendientes.
  async pendingPoints(query: QueryPendingPointsDto) {
    return this.prisma.meetingPoint.findMany({
      where: {
        status: { in: OPEN_POINT_STATUSES },
        carriedTo: { is: null },
        responsibleId: query.responsibleId,
        meeting: { status: { not: MeetingStatus.CANCELLED } },
      },
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      take: 300,
      include: {
        responsible: USER_SELECT,
        workItem: { select: { id: true, title: true, status: true } },
        meeting: { select: { id: true, title: true, date: true, area: true } },
        _count: { select: { notes: true } },
      },
    });
  }

  // Crea una tarea del Kanban a partir de un punto (ej. una accion acordada en la reunion)
  // y deja el punto enlazado a esa tarea.
  async createWorkItemFromPoint(pointId: string, dto: CreateWorkItemFromPointDto, userId: string) {
    const point = await this.prisma.meetingPoint.findUnique({
      where: { id: pointId },
      include: { meeting: { select: { title: true, date: true } } },
    });
    if (!point) throw new NotFoundException('Punto no encontrado');
    if (point.workItemId) {
      throw new ConflictException('Este punto ya tiene una tarea asociada');
    }
    const module = await this.prisma.module.findUnique({ where: { id: dto.moduleId } });
    if (!module || !module.active) throw new BadRequestException('Módulo inválido');

    const meetingDate = point.meeting.date.toISOString().slice(0, 10);
    const description = [
      point.description,
      point.resolution ? `Resolución: ${point.resolution}` : null,
      `Origen: reunión "${point.meeting.title}" (${meetingDate}).`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const workItem = await this.prisma.workItem.create({
      data: {
        moduleId: dto.moduleId,
        type: dto.type ?? WorkItemType.TASK,
        priority: dto.priority ?? WorkItemPriority.MEDIUM,
        title: point.title,
        description,
        assignedToId: point.responsibleId,
        dueDate: point.dueDate,
        createdById: userId,
      },
    });

    await this.history.record({
      workItemId: workItem.id,
      userId,
      action: HistoryAction.CREATED,
      afterJson: { title: workItem.title, fromMeetingPointId: point.id },
    });

    return this.prisma.meetingPoint.update({
      where: { id: pointId },
      data: { workItemId: workItem.id },
      include: POINT_INCLUDE,
    });
  }

  private async ensurePoint(pointId: string) {
    const point = await this.prisma.meetingPoint.findUnique({ where: { id: pointId } });
    if (!point) throw new NotFoundException('Punto no encontrado');
    return point;
  }
}
