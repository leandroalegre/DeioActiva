import { Module } from '@nestjs/common';
import { WorkItemsService } from './work-items.service';
import { WorkItemsController } from './work-items.controller';
import { HistoryModule } from '../history/history.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkItemChecklistService } from './work-item-checklist.service';
import { WorkItemAttachmentsService } from './work-item-attachments.service';
import {
  WorkItemAttachmentsController,
  WorkItemChecklistController,
} from './work-item-extras.controller';

@Module({
  imports: [HistoryModule, NotificationsModule],
  controllers: [WorkItemsController, WorkItemChecklistController, WorkItemAttachmentsController],
  providers: [WorkItemsService, WorkItemChecklistService, WorkItemAttachmentsService],
  exports: [WorkItemsService],
})
export class WorkItemsModule {}
