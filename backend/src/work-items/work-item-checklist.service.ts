import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { assertWorkItemVisible } from './work-item-access';
import { CreateChecklistItemDto, UpdateChecklistItemDto } from './dto/checklist-item.dto';

// Checklist de una tarea: items que los desarrolladores tildan de a uno a medida que los
// resuelven. Se registra quien y cuando tildo cada item.
@Injectable()
export class WorkItemChecklistService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertWorkItem(workItemId: string) {
    const exists = await this.prisma.workItem.count({ where: { id: workItemId } });
    if (!exists) throw new NotFoundException('Tarea no encontrada');
  }

  private async findItem(workItemId: string, itemId: string) {
    const item = await this.prisma.workItemChecklistItem.findFirst({
      where: { id: itemId, workItemId },
    });
    if (!item) throw new NotFoundException('Item del checklist no encontrado');
    return item;
  }

  async list(workItemId: string, user: AuthenticatedUser) {
    await assertWorkItemVisible(this.prisma, workItemId, user);
    return this.prisma.workItemChecklistItem.findMany({
      where: { workItemId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(workItemId: string, dto: CreateChecklistItemDto) {
    await this.assertWorkItem(workItemId);
    const last = await this.prisma.workItemChecklistItem.aggregate({
      where: { workItemId },
      _max: { position: true },
    });
    return this.prisma.workItemChecklistItem.create({
      data: {
        workItemId,
        text: dto.text.trim(),
        position: (last._max.position ?? -1) + 1,
      },
    });
  }

  async update(
    workItemId: string,
    itemId: string,
    dto: UpdateChecklistItemDto,
    user: AuthenticatedUser,
  ) {
    const current = await this.findItem(workItemId, itemId);
    const doneChanged = dto.done !== undefined && dto.done !== current.done;
    return this.prisma.workItemChecklistItem.update({
      where: { id: itemId },
      data: {
        ...(dto.text !== undefined ? { text: dto.text.trim() } : {}),
        ...(doneChanged
          ? dto.done
            ? { done: true, doneById: user.id, doneByName: user.fullName, doneAt: new Date() }
            : { done: false, doneById: null, doneByName: null, doneAt: null }
          : {}),
      },
    });
  }

  async remove(workItemId: string, itemId: string) {
    await this.findItem(workItemId, itemId);
    await this.prisma.workItemChecklistItem.delete({ where: { id: itemId } });
  }
}
