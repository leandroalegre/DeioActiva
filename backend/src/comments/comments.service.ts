import { Injectable, NotFoundException } from '@nestjs/common';
import { HistoryAction } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { HistoryService } from '../history/history.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { assertWorkItemVisible } from '../work-items/work-item-access';

const INCLUDE = { author: { select: { id: true, fullName: true, email: true } } };

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  async findByWorkItem(workItemId: string, user: AuthenticatedUser) {
    await assertWorkItemVisible(this.prisma, workItemId, user);
    return this.prisma.workItemComment.findMany({
      where: { workItemId },
      orderBy: { createdAt: 'asc' },
      include: INCLUDE,
    });
  }

  async create(dto: CreateCommentDto, user: AuthenticatedUser) {
    await assertWorkItemVisible(this.prisma, dto.workItemId, user);
    const authorId = user.id;
    const comment = await this.prisma.workItemComment.create({
      data: {
        workItemId: dto.workItemId,
        authorId,
        text: dto.text,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: INCLUDE,
    });

    await this.history.record({
      workItemId: dto.workItemId,
      userId: authorId,
      action: HistoryAction.COMMENTED,
      afterJson: { commentId: comment.id, text: comment.text },
    });

    return comment;
  }

  // Solo se puede actualizar el seguimiento (fecha/resuelto) de un comentario, nunca su
  // texto: el comentario es un registro historico de lo que se dijo en su momento.
  async update(id: string, dto: UpdateCommentDto) {
    const existing = await this.prisma.workItemComment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Comentario no encontrado');
    }
    return this.prisma.workItemComment.update({
      where: { id },
      data: {
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}),
        ...(dto.resolved !== undefined ? { resolved: dto.resolved } : {}),
      },
      include: INCLUDE,
    });
  }
}
