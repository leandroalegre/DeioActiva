import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkItemsService } from './work-items.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { QueryWorkItemsDto } from './dto/query-work-items.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('work-items')
@ApiBearerAuth()
@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Get()
  findAll(@Query() query: QueryWorkItemsDto) {
    return this.workItemsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workItemsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateWorkItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workItemsService.create(dto, user.id);
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
