import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { isQaRestricted } from '../common/constants/roles.constant';

/**
 * Un usuario QA (ver isQaRestricted) solo puede ver las tarjetas que cargo. Para el resto
 * responde 404, igual que si la tarea no existiera, asi no se filtra que existe.
 * Se usa en tareas, checklist, imagenes y comentarios.
 */
export async function assertWorkItemVisible(
  prisma: PrismaService,
  workItemId: string,
  user: AuthenticatedUser,
): Promise<void> {
  const where = isQaRestricted(user)
    ? { id: workItemId, createdById: user.id }
    : { id: workItemId };
  const exists = await prisma.workItem.count({ where });
  if (!exists) throw new NotFoundException('Tarea no encontrada');
}
