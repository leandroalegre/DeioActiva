import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { assertWorkItemVisible } from './work-item-access';

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_WORK_ITEM = 10;

// Archivo que entrega multer (memoryStorage). Se declara aca para no sumar @types/multer.
export interface UploadedImageFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// Solo imagenes raster. SVG queda afuera a proposito (puede llevar scripts).
// El tipo se valida por la firma del archivo, no por lo que declara el navegador.
function detectImageType(buf: Buffer): string | null {
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buf.length >= 6 &&
    (buf.subarray(0, 6).toString('ascii') === 'GIF87a' ||
      buf.subarray(0, 6).toString('ascii') === 'GIF89a')
  ) {
    return 'image/gif';
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

const META_SELECT = { id: true, fileName: true, mimeType: true, size: true, createdAt: true };

@Injectable()
export class WorkItemAttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(workItemId: string, file: UploadedImageFile | undefined, user: AuthenticatedUser) {
    await assertWorkItemVisible(this.prisma, workItemId, user);

    if (!file || !file.buffer?.length) {
      throw new BadRequestException('No se recibió ninguna imagen');
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException('La imagen supera el máximo de 5 MB');
    }
    const mimeType = detectImageType(file.buffer);
    if (!mimeType) {
      throw new BadRequestException('Formato no soportado. Subí una imagen PNG, JPG, GIF o WEBP');
    }
    const count = await this.prisma.workItemAttachment.count({ where: { workItemId } });
    if (count >= MAX_ATTACHMENTS_PER_WORK_ITEM) {
      throw new BadRequestException(
        `La tarea ya tiene ${MAX_ATTACHMENTS_PER_WORK_ITEM} imágenes (máximo permitido)`,
      );
    }

    // multer entrega el nombre en latin1; se reinterpreta como UTF-8 para no romper tildes.
    const fileName = Buffer.from(file.originalname || 'imagen', 'latin1')
      .toString('utf8')
      .slice(0, 180);

    return this.prisma.workItemAttachment.create({
      data: {
        workItemId,
        fileName,
        mimeType,
        size: file.size,
        data: file.buffer,
        uploadedById: user.id,
      },
      select: META_SELECT,
    });
  }

  async getContent(workItemId: string, attachmentId: string, user: AuthenticatedUser) {
    await assertWorkItemVisible(this.prisma, workItemId, user);
    const attachment = await this.prisma.workItemAttachment.findFirst({
      where: { id: attachmentId, workItemId },
    });
    if (!attachment) throw new NotFoundException('Imagen no encontrada');
    return attachment;
  }

  async remove(workItemId: string, attachmentId: string) {
    const attachment = await this.prisma.workItemAttachment.findFirst({
      where: { id: attachmentId, workItemId },
      select: { id: true },
    });
    if (!attachment) throw new NotFoundException('Imagen no encontrada');
    await this.prisma.workItemAttachment.delete({ where: { id: attachmentId } });
  }
}
