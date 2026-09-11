import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLE_CODES } from '../common/constants/roles.constant';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('modules')
@ApiBearerAuth()
@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get()
  findTree() {
    return this.modulesService.findTree();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.modulesService.findOne(id);
  }

  @Roles(ROLE_CODES.ADMIN)
  @Post()
  create(@Body() dto: CreateModuleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.modulesService.create(dto, user.id);
  }

  @Roles(ROLE_CODES.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateModuleDto) {
    return this.modulesService.update(id, dto);
  }
}
