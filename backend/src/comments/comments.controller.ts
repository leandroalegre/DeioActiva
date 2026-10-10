import { Body, Controller, Get, Param, Patch, Query, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ScopedRolesAllowed } from '../common/decorators/roles.decorator';
import { ROLE_CODES } from '../common/constants/roles.constant';

class WorkItemIdQueryDto {
  @IsUUID()
  workItemId: string;
}

@ApiTags('comments')
@ApiBearerAuth()
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // El perfil QA lee y comenta sus propias tarjetas (ver assertWorkItemVisible).
  @ScopedRolesAllowed(ROLE_CODES.QA)
  @Get()
  findByWorkItem(@Query() query: WorkItemIdQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.commentsService.findByWorkItem(query.workItemId, user);
  }

  @ScopedRolesAllowed(ROLE_CODES.QA)
  @Post()
  create(@Body() dto: CreateCommentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.commentsService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCommentDto) {
    return this.commentsService.update(id, dto);
  }
}
