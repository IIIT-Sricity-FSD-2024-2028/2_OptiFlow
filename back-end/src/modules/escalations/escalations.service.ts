import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateEscalationDto } from './dto/create-escalation.dto';
import { UpdateEscalationDto } from './dto/update-escalation.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class EscalationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async findAll(companyId?: string) {
    return this.prisma.escalation.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, fullName: true, email: true } },
        targetManager: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, companyId?: string) {
    const escalation = await this.prisma.escalation.findFirst({
      where: {
        id,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        task: true,
        project: true,
        reportedBy: { select: { id: true, fullName: true, email: true } },
        targetManager: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!escalation) throw new NotFoundException(`Escalation ${id} not found`);
    return escalation;
  }

  async create(
    dto: CreateEscalationDto,
    actorUserId: string,
    companyId?: string,
  ) {
    const newEscalation = await this.prisma.escalation.create({
      data: {
        companyId:
          dto.companyId || companyId || 'b7744408-190c-4b83-82c5-ab0049afb6b2',
        taskId: dto.task_id ?? null,
        projectId: dto.project_id ?? null,
        reportedById: dto.reported_by || actorUserId,
        targetManagerId: dto.target_manager_id ?? null,
        title: dto.title,
        description: dto.description ?? '',
        blockerType: dto.blocker_type ?? 'General',
        priority: dto.priority ?? 'High',
        status: 'Open',
      },
    });

    this.auditLogs.create({
      entity_id: newEscalation.id,
      entity_type: 'Escalation',
      action: 'CREATE',
      performed_by: actorUserId,
      new_value: newEscalation as any,
    });

    return this.findOne(newEscalation.id);
  }

  async update(id: string, dto: UpdateEscalationDto, actorUserId: string) {
    const before = await this.findOne(id);
    const updated = await this.prisma.escalation.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.blocker_type ? { blockerType: dto.blocker_type } : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(dto.status
          ? {
              status: dto.status as any,
              resolvedAt: dto.status === 'Resolved' ? new Date() : null,
            }
          : {}),
      },
    });

    const statusChanged =
      dto.status !== undefined && dto.status !== before.status;
    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Escalation',
      action: statusChanged ? 'STATUS_CHANGE' : 'UPDATE',
      performed_by: actorUserId,
      old_value: before as any,
      new_value: updated as any,
    });

    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const before = await this.findOne(id);
    await this.prisma.escalation.delete({ where: { id } });

    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Escalation',
      action: 'DELETE',
      performed_by: actorUserId,
      old_value: before as any,
    });

    return { message: 'Escalation deleted successfully' };
  }
}
