import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

// El texto de un comentario no se edita (se preserva como registro historico); lo unico
// que se puede actualizar es su seguimiento: la fecha y si ya se resolvio.
export class UpdateCommentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;
}
