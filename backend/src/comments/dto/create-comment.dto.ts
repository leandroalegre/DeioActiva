import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty()
  @IsUUID()
  workItemId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  text: string;
}
