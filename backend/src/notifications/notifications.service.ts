import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ROLE_CODES } from '../common/constants/roles.constant';

const LIST_LIMIT = 30;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const [data, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { data, unreadCount };
  }

  async markRead(id: string, userId: string) {
    const existing = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Aviso no encontrado');
    if (existing.readAt) return existing;
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  /**
   * Si quien creo la tarjeta tiene el rol QA (principal o adicional), le deja un aviso de que
   * su reporte llego a Completado para que valide la correccion. No se avisa a uno mismo.
   */
  async notifyQaReporterOfCompletion(
    workItem: { id: string; title: string; createdById: string },
    changedById: string,
  ): Promise<boolean> {
    if (workItem.createdById === changedById) return false;
    const creator = await this.prisma.user.findUnique({
      where: { id: workItem.createdById },
      select: {
        active: true,
        role: { select: { code: true } },
        additionalRoles: { select: { role: { select: { code: true } } } },
      },
    });
    if (!creator?.active) return false;
    const codes = [creator.role.code, ...creator.additionalRoles.map((r) => r.role.code)];
    if (!codes.includes(ROLE_CODES.QA)) return false;

    await this.prisma.notification.create({
      data: {
        userId: workItem.createdById,
        workItemId: workItem.id,
        text: `Tu reporte "${workItem.title}" pasó a Completado. Revisá que la corrección funcione y dejá un comentario si sigue fallando.`,
      },
    });
    return true;
  }
}
