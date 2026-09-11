import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';

// Solo lectura: los roles son datos de referencia sembrados por el seed (ver prisma/seed.ts).
// Cualquier usuario autenticado puede listarlos (los necesita, por ejemplo, el combo de
// "asignar rol" en la pantalla de Usuarios).
@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }
}
