import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingPointsController, MeetingsController } from './meetings.controller';
import { MeetingUsersController } from './meeting-users.controller';
import { MeetingUsersService } from './meeting-users.service';

@Module({
  controllers: [MeetingsController, MeetingPointsController, MeetingUsersController],
  providers: [MeetingsService, MeetingUsersService],
})
export class MeetingsModule {}
