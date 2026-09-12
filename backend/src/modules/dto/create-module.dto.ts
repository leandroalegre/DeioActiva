import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateModuleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Identificador unico en minusculas, con guiones (ej: mi-modulo)' })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug debe ser minuscula, alfanumerico, separado por guiones',
  })
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Id del modulo padre, para submodulos' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  // Sin default de clase (mismo motivo que en work-items/milestones): pisaria order en
  // cualquier PATCH parcial. El default real se aplica en el service, solo en create().
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  // Sin default de clase: pisaria active (por ej. reactivaria un modulo desactivado) en
  // cualquier PATCH parcial que no lo incluya. Default real solo en el service, en create().
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
