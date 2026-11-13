import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { isQaRestricted } from '../common/constants/roles.constant';

/**
 * Un usuario QA (ver isQaRestricted) solo ve las tarjetas que cargo y las que tienen el tilde
 * "Visible para QA". Para el resto responde 404, igual que si la tarea no existiera, asi no
 * se filtra que existe. Se usa en tareas, checklist, imagenes y comentarios.
 */
export function qaVisibilityWhere(user: { id: string }): Prisma.WorkItemWhereInput {
  return { OR: [{ createdById: user.id }, { visibleToQa: true }] };
}

export function isVisibleToQaUser(
  workItem: { createdById: string; visibleToQa: boolean },
  user: { id: string },
): boolean {
  return workItem.createdById === user.id || workItem.visibleToQa;
}

export async function assertWorkItemVisible(
  prisma: PrismaService,
  workItemId: string,
  user: AuthenticatedUser,
): Promise<void> {
  const where = isQaRestricted(user)
    ? { id: workItemId, ...qaVisibilityWhere(user) }
    : { id: workItemId };
  const exists = await prisma.workItem.count({ where });
  if (!exists) throw new NotFoundException('Tarea no encontrada');
}
