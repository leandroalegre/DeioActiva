import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ScopedRolesAllowed } from '../common/decorators/roles.decorator';
import { ROLE_CODES } from '../common/constants/roles.constant';
import { CreateChecklistItemDto, UpdateChecklistItemDto } from './dto/checklist-item.dto';
import { WorkItemChecklistService } from './work-item-checklist.service';
import {
  MAX_ATTACHMENT_BYTES,
  UploadedImageFile,
  WorkItemAttachmentsService,
} from './work-item-attachments.service';

@ApiTags('work-items')
@ApiBearerAuth()
@Controller('work-items/:workItemId/checklist')
export class WorkItemChecklistController {
  constructor(private readonly checklist: WorkItemChecklistService) {}

  // El perfil QA puede ver el checklist de sus tarjetas, pero no tildar ni editar.
  @ScopedRolesAllowed(ROLE_CODES.QA)
  @Get()
  list(
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checklist.list(workItemId, user);
  }

  @Post()
  create(
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.checklist.create(workItemId, dto);
  }

  @Patch(':itemId')
  update(
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateChecklistItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checklist.update(workItemId, itemId, dto, user);
  }

  @Delete(':itemId')
  @HttpCode(204)
  remove(
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.checklist.remove(workItemId, itemId);
  }
}

@ApiTags('work-items')
@ApiBearerAuth()
@Controller('work-items/:workItemId/attachments')
export class WorkItemAttachmentsController {
  constructor(private readonly attachments: WorkItemAttachmentsService) {}

  // El perfil QA adjunta capturas a sus propios reportes (y las puede ver), pero no borrar.
  @ScopedRolesAllowed(ROLE_CODES.QA)
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      // Sin storage: multer usa memoria por defecto (file.buffer), que es lo que se guarda en la base.
      // +1 byte para que el service distinga "justo 5 MB" de "mas de 5 MB" con un mensaje claro;
      // multer corta cualquier cosa mas grande sin cargarla entera en memoria.
      limits: { fileSize: MAX_ATTACHMENT_BYTES + 1, files: 1 },
    }),
  )
  upload(
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
    @UploadedFile() file: UploadedImageFile | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachments.upload(workItemId, file, user);
  }

  @ScopedRolesAllowed(ROLE_CODES.QA)
  @Get(':attachmentId')
  async content(
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const attachment = await this.attachments.getContent(workItemId, attachmentId, user);
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Length', String(attachment.data.length));
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
    );
    res.end(Buffer.from(attachment.data));
  }

  @Delete(':attachmentId')
  @HttpCode(204)
  remove(
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.attachments.remove(workItemId, attachmentId);
  }
}
