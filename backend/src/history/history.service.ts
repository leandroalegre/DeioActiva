import { Injectable } from '@nestjs/common';
import { HistoryAction, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginatedResult, PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  // Usado por otros modulos (work-items, comments) para dejar rastro de cada cambio.
  // Queda centralizado aca para que WorkItemHistory.action nunca reciba valores libres.
  record(params: {
    workItemId: string;
    userId: string;
    action: HistoryAction;
    beforeJson?: Prisma.InputJsonValue | null;
    afterJson?: Prisma.InputJsonValue | null;
  }) {
    return this.prisma.workItemHistory.create({
      data: {
        workItemId: params.workItemId,
        userId: params.userId,
        action: params.action,
        beforeJson: params.beforeJson ?? undefined,
        afterJson: params.afterJson ?? undefined,
      },
    });
  }

  async findAll(
    query: PaginationQueryDto & { workItemId?: string },
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = query.workItemId ? { workItemId: query.workItemId } : {};

    const [data, total] = await Promise.all([
      this.prisma.workItemHistory.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullName: true, email: true } } },
      }),
      this.prisma.workItemHistory.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }
}
