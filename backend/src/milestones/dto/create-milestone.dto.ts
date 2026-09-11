import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MilestoneStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateMilestoneDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ enum: MilestoneStatus, default: MilestoneStatus.PENDING })
  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus = MilestoneStatus.PENDING;
}
