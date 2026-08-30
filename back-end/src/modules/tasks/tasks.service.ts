import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  buildTaskListWhere,
  TenantListScope,
  assertBranchManagerScope,
} from '../../core/utils/tenant-scope.util';
import { RequestUser } from '../../core/middleware/tenant.middleware';

const CAN_DELEGATE = new Set([
  'team_leader',
  'project_manager',
  'superuser',
  'branch_manager',
  'Owner',
  'Project Manager',
  'Team Leader',
  'Branch Manager',
]);

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(scope: TenantListScope) {
    const companyId = scope.user?.companyId || scope.companyId;

    return this.prisma.task.findMany({
      where: buildTaskListWhere({ ...scope, companyId }),
      include: {
        subtasks: { where: { deletedAt: null } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        project: {
          select: {
            id: true,
            name: true,
            team: {
              select: {
                branch: { select: { id: true, name: true, companyId: true } },
              },
            },
          },
        },
        escalations: { where: { status: 'Open' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, companyId?: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        subtasks: { where: { deletedAt: null } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        project: { select: { id: true, name: true } },
        escalations: true,
        complianceEvidence: true,
      },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async findByAssignee(userId: string) {
    return this.prisma.task.findMany({
      where: {
        assignedToId: userId,
        deletedAt: null,
      },
      include: {
        subtasks: { where: { deletedAt: null } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateTaskDto, actorUserId: string, user?: RequestUser) {
    if (dto.project_id) {
      await this.assertTaskProjectBranchAccess(dto.project_id, user);
    }

    const newTask = await this.prisma.task.create({
      data: {
        companyId: dto.companyId,
        projectId: dto.project_id ?? null,
        title: dto.title,
        description: dto.description ?? '',
        createdById: dto.created_by ?? actorUserId,
        assignedToId: dto.assigned_to ?? null,
        status: dto.status ?? 'Draft',
        priority: dto.priority ?? 'Medium',
        estimatedHours: dto.estimated_hours ?? 0,
        actualHours: dto.actual_hours ?? 0,
        dueDate: dto.due_date ? new Date(dto.due_date) : null,
      },
    });

    this.auditLogs.create({
      entity_id: newTask.id,
      entity_type: 'Task',
      action: 'CREATE',
      performed_by: actorUserId,
      new_value: newTask as any,
    });

    return this.findOne(newTask.id);
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    actorUserId: string,
    actorRole?: string,
    user?: RequestUser,
  ) {
    const before = await this.findOne(id);
    await this.assertTaskBranchAccess(id, user);

    if (dto.project_id !== undefined && dto.project_id !== null) {
      await this.assertTaskProjectBranchAccess(dto.project_id, user);
    }

    if (
      dto.assigned_to !== undefined &&
      dto.assigned_to !== before.assignedToId &&
      actorRole &&
      !CAN_DELEGATE.has(actorRole)
    ) {
      throw new ForbiddenException(
        'Only team leaders or project managers may reassign tasks.',
      );
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.project_id !== undefined ? { projectId: dto.project_id } : {}),
        ...(dto.assigned_to !== undefined
          ? { assignedToId: dto.assigned_to }
          : {}),
        ...(dto.status !== undefined
          ? {
              status: dto.status,
              completedAt: dto.status === 'Completed' ? new Date() : null,
            }
          : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.estimated_hours !== undefined
          ? { estimatedHours: dto.estimated_hours }
          : {}),
        ...(dto.actual_hours !== undefined
          ? { actualHours: dto.actual_hours }
          : {}),
        ...(dto.due_date !== undefined
          ? { dueDate: dto.due_date ? new Date(dto.due_date) : null }
          : {}),
      },
    });

    const statusChanged =
      dto.status !== undefined && dto.status !== before.status;
    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Task',
      action: statusChanged ? 'STATUS_CHANGE' : 'UPDATE',
      performed_by: actorUserId,
      old_value: before as any,
      new_value: updated as any,
    });

    if (statusChanged && updated.status === 'Completed') {
      this.eventEmitter.emit('task.completed', updated);
    }

    return this.findOne(updated.id);
  }

  async remove(id: string, actorUserId: string, user?: RequestUser) {
    const before = await this.findOne(id);
    await this.assertTaskBranchAccess(id, user);
    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Task',
      action: 'DELETE',
      performed_by: actorUserId,
      old_value: before as any,
    });

    return { message: 'Task soft deleted successfully' };
  }

  private async assertTaskProjectBranchAccess(
    projectId: string,
    user?: RequestUser,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { team: { select: { branchId: true } } },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    assertBranchManagerScope(user, project.team?.branchId, 'manage tasks in');
  }

  private async assertTaskBranchAccess(taskId: string, user?: RequestUser) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        project: {
          include: { team: { select: { branchId: true } } },
        },
      },
    });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);
    assertBranchManagerScope(
      user,
      task.project?.team?.branchId,
      'manage tasks in',
    );
  }
}
