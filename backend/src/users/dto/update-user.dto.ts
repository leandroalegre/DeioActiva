import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {
  @ApiPropertyOptional({ description: 'Si se envia, reemplaza la password actual del usuario' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
