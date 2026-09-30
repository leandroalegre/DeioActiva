import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

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

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}
