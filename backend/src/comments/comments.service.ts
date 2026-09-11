import { Injectable } from '@nestjs/common';
import { HistoryAction } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { HistoryService } from '../history/history.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  findByWorkItem(workItemId: string) {
    return this.prisma.workItemComment.findMany({
      where: { workItemId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async create(dto: CreateCommentDto, authorId: string) {
    const comment = await this.prisma.workItemComment.create({
      data: { workItemId: dto.workItemId, authorId, text: dto.text },
      include: { author: { select: { id: true, fullName: true, email: true } } },
    });

    await this.history.record({
      workItemId: dto.workItemId,
      userId: authorId,
      action: HistoryAction.COMMENTED,
      afterJson: { commentId: comment.id, text: comment.text },
    });

    return comment;
  }
}
