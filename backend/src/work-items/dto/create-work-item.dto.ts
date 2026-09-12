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

  // Sin valor por defecto en la clase a proposito: si se lo pusieramos aca, NestJS/
  // class-transformer lo materializa incluso en un PATCH parcial que no manda este campo
  // (UpdateWorkItemDto extiende PartialType(CreateWorkItemDto)), y ese valor "por defecto"
  // termina pisando el valor real en la base al hacer update() - es lo que rompia la
  // prioridad/progreso de una tarea cada vez que se arrastraba en el Kanban (solo se manda
  // {status} en ese caso). El default real se aplica en el service, solo en create().
  @ApiPropertyOptional({ enum: WorkItemPriority, default: WorkItemPriority.MEDIUM })
  @IsOptional()
  @IsEnum(WorkItemPriority)
  priority?: WorkItemPriority;

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

  // Mismo motivo que priority: sin default de clase, para que un PATCH parcial no lo pise.
  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  versionTarget?: string;

  @ApiPropertyOptional({ description: 'Hito (milestone) al que esta tarea contribuye, opcional' })
  @IsOptional()
  @IsUUID()
  milestoneId?: string;
}
