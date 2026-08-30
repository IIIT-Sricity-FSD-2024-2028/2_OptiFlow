import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string, entityType?: string, entityId?: string) {
    return this.prisma.attachment.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId: String(entityId) } : {}),
      },
      include: {
        uploadedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!attachment) throw new NotFoundException(`Attachment ${id} not found`);
    return attachment;
  }

  async create(
    dto: CreateAttachmentDto,
    companyId: string,
    uploadedById: string,
  ) {
    return this.prisma.attachment.create({
      data: {
        companyId,
        entityType: dto.entityType,
        entityId: String(dto.entityId),
        fileName: dto.fileName,
        fileType: dto.fileType,
        fileSizeBytes: dto.fileSizeBytes,
        fileUrl: dto.fileUrl,
        uploadedById,
      },
      include: {
        uploadedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.attachment.delete({ where: { id } });
    return { message: 'Attachment deleted successfully' };
  }
}
