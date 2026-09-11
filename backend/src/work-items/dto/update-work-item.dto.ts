import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { WorkItemStatus } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateWorkItemDto } from './create-work-item.dto';

export class UpdateWorkItemDto extends PartialType(CreateWorkItemDto) {
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
