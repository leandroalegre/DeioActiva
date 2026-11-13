import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { DNI_PATTERN } from '../../common/utils/dni';

// Alta de un usuario desde la seccion Reuniones: el rol NO viene del cliente, siempre es
// "reuniones" (ver MeetingUsersService).
export class CreateMeetingUserDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  fullName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'DNI (opcional, con o sin puntos)' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => typeof o.dni === 'string' && o.dni.trim() !== '')
  @Matches(DNI_PATTERN, { message: 'El DNI tiene que tener entre 6 y 10 números' })
  dni?: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}
