import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkItemPriority, WorkItemType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateWorkItemDto {
  @ApiProperty()
  @IsUUID()
  moduleId: string;

  @ApiProperty({ enum: WorkItemType })
  @IsEnum(WorkItemType)
  type: WorkItemType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: WorkItemPriority, default: WorkItemPriority.MEDIUM })
  @IsOptional()
  @IsEnum(WorkItemPriority)
  priority?: WorkItemPriority = WorkItemPriority.MEDIUM;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plannedStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plannedEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercentage?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  versionTarget?: string;
}
