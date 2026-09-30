import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, ScopedRolesAllowed } from '../common/decorators/roles.decorator';
import { MEETING_MANAGER_ROLES, ROLE_CODES } from '../common/constants/roles.constant';
import { MeetingUsersService } from './meeting-users.service';
import { CreateMeetingUserDto } from './dto/meeting-user.dto';

// Admin y perfil Reuniones (super_admin siempre pasa) pueden ver y dar de alta usuarios del
// perfil Reuniones. No sirve para crear usuarios de ningun otro rol.
@ApiTags('meetings')
@ApiBearerAuth()
@ScopedRolesAllowed(ROLE_CODES.REUNIONES)
@Roles(...MEETING_MANAGER_ROLES)
@Controller('meeting-users')
export class MeetingUsersController {
  constructor(private readonly meetingUsersService: MeetingUsersService) {}

  @Get()
  findAll() {
    return this.meetingUsersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateMeetingUserDto) {
    return this.meetingUsersService.create(dto);
  }
}
