import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class SubtasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async findAll(companyId?: string) {
    return this.prisma.subtask.findMany({
      where: {
        deletedAt: null,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        task: { select: { id: true, title: true, projectId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTask(taskId: string) {
    return this.prisma.subtask.findMany({
      where: {
        taskId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const subtask = await this.prisma.subtask.findFirst({
      where: { id, deletedAt: null },
      include: {
        task: { select: { id: true, title: true } },
      },
    });
    if (!subtask) throw new NotFoundException(`Subtask ${id} not found`);
    return subtask;
  }

  async create(dto: CreateSubtaskDto, actorUserId: string) {
    const parentTask = await this.prisma.task.findUnique({
      where: { id: dto.task_id },
    });
    if (!parentTask)
      throw new NotFoundException(`Task ${dto.task_id} not found`);

    const newSubtask = await this.prisma.subtask.create({
      data: {
        companyId: dto.companyId || parentTask.companyId,
        taskId: dto.task_id,
        title: dto.title,
        description: dto.description ?? '',
        createdById: dto.created_by ?? actorUserId,
        assignedToId: dto.assigned_to ?? null,
        status: dto.status ?? 'Draft',
        dueDate: dto.due_date ? new Date(dto.due_date) : null,
      },
    });

    this.auditLogs.create({
      entity_id: newSubtask.id,
      entity_type: 'Subtask',
      action: 'CREATE',
      performed_by: actorUserId,
      new_value: newSubtask as any,
    });

    return newSubtask;
  }

  async update(
    id: string,
    dto: UpdateSubtaskDto,
    actorUserId: string,
    actorRole?: string,
  ) {
    const before = await this.findOne(id);
    const updated = await this.prisma.subtask.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.assigned_to !== undefined
          ? { assignedToId: dto.assigned_to }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.due_date !== undefined
          ? { dueDate: dto.due_date ? new Date(dto.due_date) : null }
          : {}),
      },
    });

    const statusChanged =
      dto.status !== undefined && dto.status !== before.status;
    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Subtask',
      action: statusChanged ? 'STATUS_CHANGE' : 'UPDATE',
      performed_by: actorUserId,
      old_value: before as any,
      new_value: updated as any,
    });

    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const before = await this.findOne(id);
    await this.prisma.subtask.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Subtask',
      action: 'DELETE',
      performed_by: actorUserId,
      old_value: before as any,
    });

    return { message: 'Subtask soft deleted successfully' };
  }
}
