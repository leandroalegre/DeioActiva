import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ScopedRolesAllowed } from '../common/decorators/roles.decorator';
import { SCOPED_ROLE_CODES } from '../common/constants/roles.constant';

// Avisos del usuario logueado (campanita de la barra superior). Cada uno ve solo los suyos.
@ApiTags('notifications')
@ApiBearerAuth()
@ScopedRolesAllowed(...SCOPED_ROLE_CODES)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.list(user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markRead(id, user.id);
  }

  @Post('read-all')
  @HttpCode(200)
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markAllRead(user.id);
  }
}
