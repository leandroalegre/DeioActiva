import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { WorkItemStatus } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateWorkItemDto } from './create-work-item.dto';

// El checklist no se edita por PATCH de la tarea: tiene sus propios endpoints.
export class UpdateWorkItemDto extends PartialType(
  OmitType(CreateWorkItemDto, ['checklist'] as const),
) {
  @ApiPropertyOptional({ enum: WorkItemStatus })
  @IsOptional()
  @IsEnum(WorkItemStatus)
  status?: WorkItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  blocked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  blockReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  actualStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  actualEnd?: string;
}
