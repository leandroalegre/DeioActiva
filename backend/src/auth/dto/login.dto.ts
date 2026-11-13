import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  // Email o DNI (con o sin puntos).
  @ApiPropertyOptional({ description: 'Email o DNI' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  identifier?: string;

  // Nombre anterior del campo: lo sigue mandando un frontend viejo que quedo en cache.
  @ApiPropertyOptional({ deprecated: true, description: 'Usar identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  email?: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}
