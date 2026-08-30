import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateProcessInstanceStepDto } from './dto/create-process-instance-step.dto';
import { UpdateProcessInstanceStepDto } from './dto/update-process-instance-step.dto';

@Injectable()
export class ProcessInstanceStepsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(processInstanceId?: string) {
    return this.prisma.processInstanceStep.findMany({
      where: processInstanceId ? { processInstanceId } : undefined,
      include: {
        templateStep: { include: { onRejectGotoStep: true } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
        actionedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async findOne(id: string) {
    const step = await this.prisma.processInstanceStep.findUnique({
      where: { id },
      include: {
        templateStep: { include: { onRejectGotoStep: true } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
        actionedBy: { select: { id: true, fullName: true, email: true } },
        processInstance: true,
      },
    });
    if (!step)
      throw new NotFoundException(`ProcessInstanceStep ${id} not found`);
    return step;
  }

  async create(dto: CreateProcessInstanceStepDto) {
    return this.prisma.processInstanceStep.create({
      data: {
        processInstanceId: dto.processInstanceId,
        templateStepId: dto.templateStepId,
        assignedToId: dto.assignedToId ?? null,
        status: (dto.status as any) ?? 'Pending',
        remarks: dto.remarks ?? null,
      },
      include: { templateStep: true },
    });
  }

  async update(
    id: string,
    dto: UpdateProcessInstanceStepDto,
    actionedByUserId?: string,
  ) {
    const currentStep = await this.findOne(id);
    const newStatus = dto.status ?? currentStep.status;

    const updatedStep = await this.prisma.processInstanceStep.update({
      where: { id },
      data: {
        status: newStatus as any,
        remarks: dto.remarks !== undefined ? dto.remarks : currentStep.remarks,
        actionedById:
          actionedByUserId || dto.actionedById || currentStep.actionedById,
        actionedAt: new Date(),
      },
      include: { templateStep: true },
    });

    // Rejection loop-back logic
    if (
      newStatus === 'Rejected' &&
      updatedStep.templateStep.onRejectGotoStepId
    ) {
      const targetTemplateStepId = updatedStep.templateStep.onRejectGotoStepId;
      const targetInstanceStep =
        await this.prisma.processInstanceStep.findFirst({
          where: {
            processInstanceId: currentStep.processInstanceId,
            templateStepId: targetTemplateStepId,
          },
        });

      if (targetInstanceStep) {
        // Reset target step to pending and update instance currentStepId
        await this.prisma.processInstanceStep.update({
          where: { id: targetInstanceStep.id },
          data: {
            status: 'Pending',
            remarks: `Loop back from step ${updatedStep.templateStep.name}`,
          },
        });
        await this.prisma.processInstance.update({
          where: { id: currentStep.processInstanceId },
          data: { currentStepId: targetInstanceStep.id, status: 'Active' },
        });
      }
    } else if (newStatus === 'Approved') {
      // Find next step in order
      const nextTemplateStep = await this.prisma.processTemplateStep.findFirst({
        where: {
          templateId: updatedStep.templateStep.templateId,
          stepOrder: { gt: updatedStep.templateStep.stepOrder },
        },
        orderBy: { stepOrder: 'asc' },
      });

      if (nextTemplateStep) {
        const nextInstanceStep =
          await this.prisma.processInstanceStep.findFirst({
            where: {
              processInstanceId: currentStep.processInstanceId,
              templateStepId: nextTemplateStep.id,
            },
          });
        if (nextInstanceStep) {
          await this.prisma.processInstance.update({
            where: { id: currentStep.processInstanceId },
            data: { currentStepId: nextInstanceStep.id },
          });
        }
      } else {
        // Final step completed
        await this.prisma.processInstance.update({
          where: { id: currentStep.processInstanceId },
          data: { status: 'Completed', completedAt: new Date() },
        });
      }
    }

    return updatedStep;
  }
}
