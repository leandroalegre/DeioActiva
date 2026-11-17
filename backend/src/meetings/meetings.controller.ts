import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import {
  CarryOverDto,
  CreateMeetingDto,
  FinishMeetingDto,
  QueryMeetingsDto,
  UpdateAttendanceDto,
  UpdateMeetingDto,
} from './dto/meeting.dto';
import {
  CreateMeetingPointDto,
  CreatePointNoteDto,
  CreateWorkItemFromPointDto,
  GenerateWorkItemsDto,
  QueryPendingPointsDto,
  ReorderPointsDto,
  UpdateMeetingPointDto,
} from './dto/meeting-point.dto';
import { Roles, ScopedRolesAllowed } from '../common/decorators/roles.decorator';
import { MEETING_WRITER_ROLES, ROLE_CODES } from '../common/constants/roles.constant';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

// Lectura: cualquier usuario autenticado. Alta/edicion/baja: admin, perfil "reuniones" y
// perfil "carga_reuniones" (super_admin siempre pasa). Los perfiles de reuniones solo tienen
// acceso a estos endpoints. "carga_reuniones" ademas queda limitado a sus propias reuniones
// dentro de MeetingsService (por eso todos los metodos reciben el usuario).
@ApiTags('meetings')
@ApiBearerAuth()
@ScopedRolesAllowed(ROLE_CODES.REUNIONES, ROLE_CODES.CARGA_REUNIONES)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get('options')
  options() {
    return this.meetingsService.options();
  }

  @Get()
  findAll(@Query() query: QueryMeetingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetingsService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.meetingsService.findOne(id, user);
  }

  @Roles(...MEETING_WRITER_ROLES)
  @Post()
  create(@Body() dto: CreateMeetingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetingsService.create(dto, user);
  }

  @Roles(...MEETING_WRITER_ROLES)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMeetingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetingsService.update(id, dto, user);
  }

  @Roles(...MEETING_WRITER_ROLES)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.meetingsService.remove(id, user);
  }

  @Roles(...MEETING_WRITER_ROLES)
  @Post(':id/finish')
  finish(@Param('id') id: string, @Body() dto: FinishMeetingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetingsService.finish(id, dto, user);
  }

  @Roles(...MEETING_WRITER_ROLES)
  @Patch(':id/attendance')
  updateAttendance(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.meetingsService.updateAttendance(id, dto, user);
  }

  @Roles(...MEETING_WRITER_ROLES)
  @Post(':id/carry-over')
  carryOver(@Param('id') id: string, @Body() dto: CarryOverDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetingsService.carryOver(id, dto.fromMeetingId, user);
  }

  @Roles(...MEETING_WRITER_ROLES)
  @Post(':id/points')
  createPoint(@Param('id') id: string, @Body() dto: CreateMeetingPointDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetingsService.createPoint(id, dto, user);
  }

  // Genera en lote tareas del Kanban a partir de puntos de esta reunion.
  @Roles(...MEETING_WRITER_ROLES)
  @Post(':id/work-items')
  generateWorkItems(
    @Param('id') id: string,
    @Body() dto: GenerateWorkItemsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.meetingsService.generateWorkItems(id, dto.items, user);
  }

  @Roles(...MEETING_WRITER_ROLES)
  @Post(':id/points/reorder')
  reorderPoints(@Param('id') id: string, @Body() dto: ReorderPointsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetingsService.reorderPoints(id, dto.pointIds, user);
  }
}

// Endpoints de puntos sueltos (por id de punto). Van en otra ruta base para no chocar con
// /meetings/:id.
@ApiTags('meetings')
@ApiBearerAuth()
@ScopedRolesAllowed(ROLE_CODES.REUNIONES, ROLE_CODES.CARGA_REUNIONES)
@Controller('meeting-points')
export class MeetingPointsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get('pending')
  pending(@Query() query: QueryPendingPointsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetingsService.pendingPoints(query, user);
  }

  @Roles(...MEETING_WRITER_ROLES)
  @Patch(':pointId')
  update(
    @Param('pointId') pointId: string,
    @Body() dto: UpdateMeetingPointDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.meetingsService.updatePoint(pointId, dto, user);
  }

  @Roles(...MEETING_WRITER_ROLES)
  @Delete(':pointId')
  @HttpCode(204)
  remove(@Param('pointId') pointId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.meetingsService.removePoint(pointId, user);
  }

  // Cualquier usuario autenticado puede dejar un avance de seguimiento sobre un punto
  // (ej. el responsable contando en que quedo), igual que los comentarios de tareas.
  @Post(':pointId/notes')
  addNote(
    @Param('pointId') pointId: string,
    @Body() dto: CreatePointNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.meetingsService.addNote(pointId, dto, user);
  }

  @Roles(...MEETING_WRITER_ROLES)
  @Post(':pointId/work-item')
  createWorkItem(
    @Param('pointId') pointId: string,
    @Body() dto: CreateWorkItemFromPointDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.meetingsService.createWorkItemFromPoint(pointId, dto, user);
  }
}
