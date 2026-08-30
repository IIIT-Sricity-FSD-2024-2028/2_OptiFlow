import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  buildProjectListWhere,
  TenantListScope,
  assertBranchManagerScope,
} from '../../core/utils/tenant-scope.util';
import { RequestUser } from '../../core/middleware/tenant.middleware';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(scope: TenantListScope) {
    return this.prisma.project.findMany({
      where: buildProjectListWhere(scope),
      include: {
        team: {
          include: {
            branch: { select: { id: true, name: true, companyId: true } },
          },
        },
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            estimatedHours: true,
            actualHours: true,
          },
        },
        escalations: {
          where: { status: 'Open' },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            branch: { select: { id: true, name: true, companyId: true } },
          },
        },
        tasks: {
          where: { deletedAt: null },
          include: {
            subtasks: { where: { deletedAt: null } },
            assignedTo: { select: { id: true, fullName: true, email: true } },
            escalations: true,
          },
        },
        processInstances: {
          include: {
            template: true,
            currentStep: true,
          },
        },
        escalations: true,
      },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async create(dto: CreateProjectDto, actorUserId: string, user?: RequestUser) {
    const team = await this.prisma.team.findUnique({
      where: { id: dto.teamId },
      include: { branch: true },
    });
    if (!team) throw new NotFoundException(`Team ${dto.teamId} not found`);

    assertBranchManagerScope(user, team.branchId, 'create projects in');

    const newProject = await this.prisma.project.create({
      data: {
        teamId: dto.teamId,
        name: dto.project_name,
        status: dto.status ?? 'Active',
        startDate: dto.start_date ? new Date(dto.start_date) : null,
        endDate: dto.end_date ? new Date(dto.end_date) : null,
        createdById: dto.createdById ?? actorUserId,
      },
      include: { team: true },
    });

    // Handle template automation
    if (dto.template_id) {
      const templateSteps = await this.prisma.processTemplateStep.findMany({
        where: { templateId: dto.template_id },
        orderBy: { stepOrder: 'asc' },
      });

      for (const [index, step] of templateSteps.entries()) {
        const newTask = await this.prisma.task.create({
          data: {
            companyId: team.branch.companyId,
            projectId: newProject.id,
            title: step.name,
            description: `Stage ${step.stepOrder} automatically generated from template`,
            createdById: actorUserId,
            status: index === 0 ? 'Active' : 'Draft',
            priority: 'Medium',
            estimatedHours: step.escalationTimeoutHours || 8,
            dueDate: newProject.endDate,
          },
        });

        this.notifications.create({
          userId: actorUserId,
          title: 'New Task Generated',
          message: `Generated step "${newTask.title}" for project "${newProject.name}".`,
          type: 'Task',
          link: `tasks.html?id=${newTask.id}`,
        });
      }
    }

    this.auditLogs.create({
      entity_id: newProject.id,
      entity_type: 'Project',
      action: 'CREATE',
      performed_by: actorUserId,
      new_value: newProject as any,
    });

    return this.findOne(newProject.id);
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    actorUserId: string,
    user?: RequestUser,
  ) {
    const before = await this.findOne(id);
    await this.assertProjectBranchAccess(id, user);

    if (dto.teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: dto.teamId },
        select: { branchId: true },
      });
      if (!team) throw new NotFoundException(`Team ${dto.teamId} not found`);
      assertBranchManagerScope(user, team.branchId, 'move projects into');
    }
    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.project_name ? { name: dto.project_name } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.start_date ? { startDate: new Date(dto.start_date) } : {}),
        ...(dto.end_date ? { endDate: new Date(dto.end_date) } : {}),
        ...(dto.teamId ? { teamId: dto.teamId } : {}),
      },
    });

    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Project',
      action: 'UPDATE',
      performed_by: actorUserId,
      old_value: before as any,
      new_value: updated as any,
    });

    return this.findOne(updated.id);
  }

  async remove(id: string, actorUserId: string, user?: RequestUser) {
    const before = await this.findOne(id);
    await this.assertProjectBranchAccess(id, user);
    await this.prisma.project.delete({ where: { id } });

    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Project',
      action: 'DELETE',
      performed_by: actorUserId,
      old_value: before as any,
    });

    return { message: 'Project deleted successfully' };
  }

  private async assertProjectBranchAccess(
    projectId: string,
    user?: RequestUser,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { team: { select: { branchId: true } } },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    assertBranchManagerScope(
      user,
      project.team?.branchId,
      'manage projects in',
    );
  }
}
