import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string, entityType?: string, entityId?: string) {
    return this.prisma.comment.findMany({
      where: {
        deletedAt: null,
        ...(companyId ? { companyId } : {}),
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId: String(entityId) } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!comment) throw new NotFoundException(`Comment ${id} not found`);
    return comment;
  }

  async create(dto: CreateCommentDto, companyId: string, userId: string) {
    return this.prisma.comment.create({
      data: {
        companyId,
        entityType: dto.entityType,
        entityId: String(dto.entityId),
        userId,
        commentText: dto.commentText,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async update(id: string, dto: UpdateCommentDto) {
    await this.findOne(id);
    return this.prisma.comment.update({
      where: { id },
      data: {
        ...(dto.commentText ? { commentText: dto.commentText } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Comment deleted successfully' };
  }
}
