import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty()
  @IsUUID()
  workItemId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  text: string;

  // Fecha de seguimiento opcional (no confundir con dueDate de la tarea): permite marcar
  // un pendiente puntual sobre lo que dice el comentario sin crear una tarea nueva.
  @ApiPropertyOptional({ description: 'Fecha de seguimiento del comentario, opcional' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
