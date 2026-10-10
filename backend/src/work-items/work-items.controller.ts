import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkItemsService } from './work-items.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { QueryWorkItemsDto } from './dto/query-work-items.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ScopedRolesAllowed } from '../common/decorators/roles.decorator';
import { ROLE_CODES } from '../common/constants/roles.constant';

@ApiTags('work-items')
@ApiBearerAuth()
@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  // El perfil QA lee y crea (solo sus tarjetas, ver WorkItemsService); no edita, no mueve
  // de columna y no borra: PATCH y DELETE no estan habilitados para el.
  @ScopedRolesAllowed(ROLE_CODES.QA)
  @Get()
  findAll(@Query() query: QueryWorkItemsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workItemsService.findAll(query, user);
  }

  @ScopedRolesAllowed(ROLE_CODES.QA)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workItemsService.findOne(id, user);
  }

  @ScopedRolesAllowed(ROLE_CODES.QA)
  @Post()
  create(@Body() dto: CreateWorkItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workItemsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workItemsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.workItemsService.remove(id);
  }
}
