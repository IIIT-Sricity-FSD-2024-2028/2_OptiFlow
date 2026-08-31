import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateProcessTemplateDto } from './dto/create-process-template.dto';
import { UpdateProcessTemplateDto } from './dto/update-process-template.dto';

@Injectable()
export class ProcessTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.processTemplate.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: { requiredPermission: true, onRejectGotoStep: true },
        },
        instances: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, companyId?: string) {
    const template = await this.prisma.processTemplate.findFirst({
      where: {
        id,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: { requiredPermission: true, onRejectGotoStep: true },
        },
        instances: true,
      },
    });
    if (!template)
      throw new NotFoundException(`ProcessTemplate ${id} not found`);
    return template;
  }

  async create(dto: CreateProcessTemplateDto, companyId: string) {
    const formattedSteps = dto.steps?.map((s, index) => {
      if (typeof s === 'string') {
        return {
          stepOrder: index + 1,
          name: s,
          stepType: 'Automated_Task' as const,
          requiredPermissionId: null as string | null,
          escalationTimeoutHours: null as number | null,
          onRejectGotoStepId: null as string | null,
        };
      }
      return {
        stepOrder: s.stepOrder ?? index + 1,
        name: s.name,
        stepType: s.stepType ?? 'Automated_Task',
        requiredPermissionId: s.requiredPermissionId ?? null,
        escalationTimeoutHours: s.escalationTimeoutHours ?? null,
        onRejectGotoStepId: s.onRejectGotoStepId ?? null,
      };
    });

    const created = await this.prisma.processTemplate.create({
      data: {
        companyId,
        name: dto.name,
        category: dto.category ?? null,
        compliance: dto.compliance ?? [],
        version: dto.version ?? 1,
        isActive: dto.isActive ?? true,
        createdById: dto.createdById || 'system',
        steps:
          formattedSteps && formattedSteps.length > 0
            ? {
                create: formattedSteps,
              }
            : undefined,
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: { requiredPermission: true, onRejectGotoStep: true },
        },
        instances: true,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          companyId,
          entityType: 'ProcessTemplate',
          entityId: created.id,
          action: 'CREATE' as any,
          performedById: dto.createdById && dto.createdById !== 'system' ? String(dto.createdById) : null,
          newValue: { name: created.name, category: created.category, stepsCount: formattedSteps?.length || 0 },
        },
      });
    } catch (_) {}

    return created;
  }

  async update(id: string, dto: UpdateProcessTemplateDto, companyId?: string) {
    const existing = await this.findOne(id, companyId);
    const { steps, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (steps !== undefined) {
        await tx.processTemplateStep.deleteMany({
          where: { templateId: id },
        });

        const formattedSteps = steps.map((s, index) => {
          if (typeof s === 'string') {
            return {
              templateId: id,
              stepOrder: index + 1,
              name: s,
              stepType: 'Automated_Task' as const,
              requiredPermissionId: null as string | null,
              escalationTimeoutHours: null as number | null,
              onRejectGotoStepId: null as string | null,
            };
          }
          return {
            templateId: id,
            stepOrder: s.stepOrder ?? index + 1,
            name: s.name,
            stepType: s.stepType ?? 'Automated_Task',
            requiredPermissionId: s.requiredPermissionId ?? null,
            escalationTimeoutHours: s.escalationTimeoutHours ?? null,
            onRejectGotoStepId: s.onRejectGotoStepId ?? null,
          };
        });

        if (formattedSteps.length > 0) {
          await tx.processTemplateStep.createMany({
            data: formattedSteps,
          });
        }
      }

      const updated = await tx.processTemplate.update({
        where: { id },
        data: {
          ...(rest.name !== undefined ? { name: rest.name } : {}),
          ...(rest.category !== undefined ? { category: rest.category } : {}),
          ...(rest.compliance !== undefined
            ? { compliance: rest.compliance }
            : {}),
          ...(rest.version !== undefined ? { version: rest.version } : {}),
          ...(rest.isActive !== undefined ? { isActive: rest.isActive } : {}),
          ...(rest.createdById !== undefined
            ? { createdById: rest.createdById }
            : {}),
        },
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
            include: { requiredPermission: true, onRejectGotoStep: true },
          },
          instances: true,
        },
      });

      try {
        await tx.auditLog.create({
          data: {
            companyId: updated.companyId,
            entityType: 'ProcessTemplate',
            entityId: updated.id,
            action: 'UPDATE' as any,
            performedById: dto.createdById && dto.createdById !== 'system' ? String(dto.createdById) : null,
            oldValue: { name: existing.name, category: existing.category },
            newValue: { name: updated.name, category: updated.category },
          },
        });
      } catch (_) {}

      return updated;
    });
  }

  async remove(id: string, companyId?: string) {
    const template = await this.findOne(id, companyId);
    await this.prisma.processTemplate.delete({ where: { id } });

    try {
      await this.prisma.auditLog.create({
        data: {
          companyId: template.companyId,
          entityType: 'ProcessTemplate',
          entityId: id,
          action: 'DELETE' as any,
          oldValue: { name: template.name },
        },
      });
    } catch (_) {}

    return { message: 'Process template deleted successfully' };
  }
}
