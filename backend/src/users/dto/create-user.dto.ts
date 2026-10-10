import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsUUID()
  roleId: string;

  // Roles que se suman al principal (ej. QA para una usuaria de Reuniones). En un PATCH,
  // si se envia reemplaza la lista completa; si no se envia, no se toca.
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  additionalRoleIds?: string[];

  // Sin default de clase: pisaria active (reactivaria una cuenta desactivada) en cualquier
  // PATCH parcial que no lo incluya explicitamente. Default real solo en el service, en create().
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
