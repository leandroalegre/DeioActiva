import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLE_CODES } from '../common/constants/roles.constant';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('milestones')
@ApiBearerAuth()
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.milestonesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.milestonesService.findOne(id);
  }

  @Roles(ROLE_CODES.ADMIN)
  @Post()
  create(@Body() dto: CreateMilestoneDto, @CurrentUser() user: AuthenticatedUser) {
    return this.milestonesService.create(dto, user.id);
  }

  @Roles(ROLE_CODES.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMilestoneDto) {
    return this.milestonesService.update(id, dto);
  }

  @Roles(ROLE_CODES.ADMIN)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.milestonesService.remove(id);
  }
}
