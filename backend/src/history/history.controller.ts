import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { HistoryService } from './history.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

class HistoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  workItemId?: string;
}

@ApiTags('history')
@ApiBearerAuth()
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  findAll(@Query() query: HistoryQueryDto) {
    return this.historyService.findAll(query);
  }
}
