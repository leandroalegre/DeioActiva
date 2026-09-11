import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkItemPriority, WorkItemStatus, WorkItemType } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryWorkItemsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: WorkItemStatus })
  @IsOptional()
  @IsEnum(WorkItemStatus)
  status?: WorkItemStatus;

  @ApiPropertyOptional({ enum: WorkItemType })
  @IsOptional()
  @IsEnum(WorkItemType)
  type?: WorkItemType;

  @ApiPropertyOptional({ enum: WorkItemPriority })
  @IsOptional()
  @IsEnum(WorkItemPriority)
  priority?: WorkItemPriority;
}
