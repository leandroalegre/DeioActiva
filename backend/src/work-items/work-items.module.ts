import { Module } from '@nestjs/common';
import { WorkItemsService } from './work-items.service';
import { WorkItemsController } from './work-items.controller';
import { HistoryModule } from '../history/history.module';

@Module({
  imports: [HistoryModule],
  controllers: [WorkItemsController],
  providers: [WorkItemsService],
  exports: [WorkItemsService],
})
export class WorkItemsModule {}
