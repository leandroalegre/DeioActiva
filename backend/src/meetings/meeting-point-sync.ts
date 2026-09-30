import {
  MeetingPointStatus,
  MeetingPointType,
  Prisma,
  PrismaClient,
  WorkItemStatus,
  WorkItemType,
} from '@prisma/client';

// Tipo de tarea que se propone al generar una tarea desde un punto de reunion.
export const POINT_TYPE_TO_WORK_ITEM_TYPE: Record<MeetingPointType, WorkItemType> = {
  REQUIREMENT: WorkItemType.REQUIREMENT,
  ACTION: WorkItemType.TASK,
  FOLLOW_UP: WorkItemType.ANALYSIS,
  DECISION: WorkItemType.TASK,
  TOPIC: WorkItemType.TASK,
  NOTE: WorkItemType.TASK,
};

const WORK_ITEM_STATUS_LABEL: Record<WorkItemStatus, string> = {
  PENDING: 'Pendiente',
  ANALYSIS: 'Análisis',
  PLANNED: 'Planificado',
  DEVELOPMENT: 'Desarrollo',
  TESTING: 'Testing',
  BLOCKED: 'Bloqueado',
  COMPLETED: 'Completado',
  DISCARDED: 'Descartado',
};

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Refleja en los puntos de reunion vinculados el nuevo estado de una tarea del Kanban:
 * - Completada  -> punto Resuelto
 * - Descartada  -> punto Descartado
 * - En curso (Análisis, Planificado, Desarrollo, Testing, Bloqueado) -> punto En curso
 *   (solo si estaba Pendiente o cerrado; un punto Postergado se respeta)
 * - Vuelve a Pendiente -> los puntos cerrados vuelven a Pendiente
 * Cada punto que cambia recibe un avance automatico para que quede el rastro.
 */
export async function syncMeetingPointsWithWorkItem(
  db: Db,
  workItemId: string,
  newStatus: WorkItemStatus,
  userId: string,
): Promise<number> {
  const closed: MeetingPointStatus[] = [MeetingPointStatus.RESOLVED, MeetingPointStatus.CANCELLED];

  let target: MeetingPointStatus;
  let fromStatuses: MeetingPointStatus[];
  if (newStatus === WorkItemStatus.COMPLETED) {
    target = MeetingPointStatus.RESOLVED;
    fromStatuses = Object.values(MeetingPointStatus).filter((s) => s !== target);
  } else if (newStatus === WorkItemStatus.DISCARDED) {
    target = MeetingPointStatus.CANCELLED;
    fromStatuses = Object.values(MeetingPointStatus).filter((s) => s !== target);
  } else if (newStatus === WorkItemStatus.PENDING) {
    target = MeetingPointStatus.PENDING;
    fromStatuses = closed;
  } else {
    target = MeetingPointStatus.IN_PROGRESS;
    fromStatuses = [MeetingPointStatus.PENDING, ...closed];
  }

  const points = await db.meetingPoint.findMany({
    where: { workItemId, status: { in: fromStatuses } },
    select: { id: true },
  });
  if (points.length === 0) return 0;

  const ids = points.map((p) => p.id);
  await db.meetingPoint.updateMany({ where: { id: { in: ids } }, data: { status: target } });
  await db.meetingPointNote.createMany({
    data: ids.map((pointId) => ({
      pointId,
      authorId: userId,
      text: `🔄 Estado actualizado automáticamente: la tarea vinculada pasó a "${WORK_ITEM_STATUS_LABEL[newStatus]}".`,
    })),
  });
  return ids.length;
}
