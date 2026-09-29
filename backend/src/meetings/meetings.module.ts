import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingPointsController, MeetingsController } from './meetings.controller';

@Module({
  controllers: [MeetingsController, MeetingPointsController],
  providers: [MeetingsService],
})
export class MeetingsModule {}
