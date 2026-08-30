import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateProcessInstanceDto } from './dto/create-process-instance.dto';
import { UpdateProcessInstanceDto } from './dto/update-process-instance.dto';

@Injectable()
export class ProcessInstancesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string, templateId?: string, projectId?: string) {
    return this.prisma.processInstance.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(templateId ? { templateId } : {}),
        ...(projectId ? { projectId } : {}),
      },
      include: {
        template: { select: { id: true, name: true, category: true } },
        project: { select: { id: true, name: true } },
        currentStep: {
          include: {
            templateStep: true,
            assignedTo: { select: { id: true, fullName: true } },
          },
        },
        steps: {
          include: {
            templateStep: true,
            assignedTo: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, companyId?: string) {
    const instance = await this.prisma.processInstance.findFirst({
      where: {
        id,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        template: { select: { id: true, name: true, category: true } },
        project: { select: { id: true, name: true } },
        currentStep: {
          include: { templateStep: true, assignedTo: true, actionedBy: true },
        },
        steps: {
          include: { templateStep: true, assignedTo: true, actionedBy: true },
        },
      },
    });
    if (!instance)
      throw new NotFoundException(`ProcessInstance ${id} not found`);
    return instance;
  }

  async create(dto: CreateProcessInstanceDto, companyId: string) {
    const template = await this.prisma.processTemplate.findUnique({
      where: { id: dto.templateId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!template)
      throw new NotFoundException(
        `ProcessTemplate ${dto.templateId} not found`,
      );

    const instance = await this.prisma.processInstance.create({
      data: {
        companyId,
        templateId: dto.templateId,
        projectId: dto.projectId ?? null,
        title: dto.title,
        status: (dto.status as any) ?? 'Draft',
        initiatedById: dto.initiatedById,
      },
    });

    // Instantiate steps for this instance
    let firstStepId: string | null = null;
    for (const [index, step] of template.steps.entries()) {
      const instStep = await this.prisma.processInstanceStep.create({
        data: {
          processInstanceId: instance.id,
          templateStepId: step.id,
          status: 'Pending',
        },
      });
      if (index === 0) firstStepId = instStep.id;
    }

    if (firstStepId) {
      await this.prisma.processInstance.update({
        where: { id: instance.id },
        data: { currentStepId: firstStepId, status: 'Active' },
      });
    }

    return this.findOne(instance.id);
  }

  async update(id: string, dto: UpdateProcessInstanceDto, companyId?: string) {
    await this.findOne(id, companyId);
    return this.prisma.processInstance.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.status
          ? {
              status: dto.status as any,
              completedAt: dto.status === 'Completed' ? new Date() : undefined,
            }
          : {}),
      },
    });
  }

  async remove(id: string, companyId?: string) {
    await this.findOne(id, companyId);
    await this.prisma.processInstanceStep.deleteMany({
      where: { processInstanceId: id },
    });
    await this.prisma.processInstance.delete({ where: { id } });
    return { message: 'Process instance deleted successfully' };
  }
}
