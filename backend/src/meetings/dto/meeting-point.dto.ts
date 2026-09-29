import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  MeetingPointStatus,
  MeetingPointType,
  WorkItemPriority,
  WorkItemType,
} from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMeetingPointDto {
  @ApiProperty()
  @IsString()
  @MaxLength(191)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: MeetingPointType })
  @IsOptional()
  @IsEnum(MeetingPointType)
  type?: MeetingPointType;

  @ApiPropertyOptional({ enum: MeetingPointStatus })
  @IsOptional()
  @IsEnum(MeetingPointStatus)
  status?: MeetingPointStatus;

  @ApiPropertyOptional({ description: 'Resolución / acuerdo' })
  @IsOptional()
  @IsString()
  resolution?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsibleId?: string | null;

  @ApiPropertyOptional({ description: 'Fecha de control YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}

export class UpdateMeetingPointDto extends PartialType(CreateMeetingPointDto) {}

export class ReorderPointsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  pointIds: string[];
}

export class CreatePointNoteDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  text: string;
}

export class CreateWorkItemFromPointDto {
  @ApiProperty()
  @IsUUID()
  moduleId: string;

  @ApiPropertyOptional({ enum: WorkItemType })
  @IsOptional()
  @IsEnum(WorkItemType)
  type?: WorkItemType;

  @ApiPropertyOptional({ enum: WorkItemPriority })
  @IsOptional()
  @IsEnum(WorkItemPriority)
  priority?: WorkItemPriority;
}

export class QueryPendingPointsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsibleId?: string;
}
