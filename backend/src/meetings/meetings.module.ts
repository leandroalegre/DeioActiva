import { Module } from '@nestjs/common';
import { HistoryModule } from '../history/history.module';
import { MeetingsService } from './meetings.service';
import { MeetingPointsController, MeetingsController } from './meetings.controller';

@Module({
  imports: [HistoryModule],
  controllers: [MeetingsController, MeetingPointsController],
  providers: [MeetingsService],
})
export class MeetingsModule {}
