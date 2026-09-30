import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { MeetingFrequency, MeetingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateMeetingPointDto } from './meeting-point.dto';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class MeetingParticipantInputDto {
  // Usuario del sistema. Si se omite, el participante es externo y "name" es obligatorio.
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  name?: string;
}

export class CreateMeetingDto {
  @ApiProperty()
  @IsString()
  @MaxLength(191)
  title: string;

  @ApiPropertyOptional({ description: 'Área convocante' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  area?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  location?: string;

  @ApiProperty({ description: 'YYYY-MM-DD' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'HH:MM' })
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'La hora de inicio debe tener formato HH:MM' })
  startTime?: string | null;

  @ApiPropertyOptional({ description: 'HH:MM' })
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'La hora de fin debe tener formato HH:MM' })
  endTime?: string | null;

  // Sin default de clase a proposito (se filtraria a Update via PartialType y pisaria el
  // valor real en un PATCH parcial). Los defaults se aplican en el service.
  @ApiPropertyOptional({ enum: MeetingFrequency })
  @IsOptional()
  @IsEnum(MeetingFrequency)
  frequency?: MeetingFrequency;

  @ApiPropertyOptional({ enum: MeetingStatus })
  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;

  @ApiPropertyOptional({ type: [MeetingParticipantInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => MeetingParticipantInputDto)
  participants?: MeetingParticipantInputDto[];

  // Solo en el alta: puntos del orden del dia iniciales.
  @ApiPropertyOptional({ type: [CreateMeetingPointDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateMeetingPointDto)
  points?: CreateMeetingPointDto[];

  // Reunion anterior de la serie; con carryOverPending=true se traen sus puntos abiertos.
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  previousMeetingId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  carryOverPending?: boolean;
}

export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  minutesNotes?: string | null;
}

export class FinishMeetingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  minutesNotes?: string;
}

export class AttendanceItemDto {
  @ApiProperty()
  @IsUUID()
  participantId: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsBoolean()
  attended: boolean | null;
}

export class UpdateAttendanceDto {
  @ApiProperty({ type: [AttendanceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  items: AttendanceItemDto[];
}

export class CarryOverDto {
  @ApiProperty({ description: 'Reunión de la que se traen los puntos abiertos' })
  @IsUUID()
  fromMeetingId: string;
}

export class QueryMeetingsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MeetingStatus })
  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['upcoming', 'past', 'all'] })
  @IsOptional()
  @IsIn(['upcoming', 'past', 'all'])
  when?: 'upcoming' | 'past' | 'all';
}
