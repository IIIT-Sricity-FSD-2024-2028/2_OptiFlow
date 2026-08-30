import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class ComplianceObserverService {
  private readonly logger = new Logger(ComplianceObserverService.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('task.completed')
  async handleTaskCompleted(task: any) {
    this.logger.log(`Task ${task.id} marked as Completed. Running compliance checks...`);
    
    // Check if the task has evidence
    const evidenceCount = await this.prisma.complianceEvidence.count({
      where: { taskId: task.id },
    });

    if (evidenceCount > 0) {
      this.logger.log(`Task ${task.id} has evidence. All good.`);
      return;
    }

    // Get the task with project and team details
    const taskDetails = await this.prisma.task.findUnique({
      where: { id: task.id },
      include: { project: true },
    });

    if (!taskDetails || !taskDetails.project || !taskDetails.project.teamId) {
      return;
    }

    const teamId = taskDetails.project.teamId;

    // Check if there's an active compliance rule for 'Mandatory Code Review' on this team
    const ruleBinding = await this.prisma.complianceBinding.findFirst({
      where: {
        scopeType: 'Team',
        scopeId: teamId,
        rule: {
          name: 'Mandatory Code Review',
          isActive: true,
        },
      },
      include: { rule: true },
    });

    if (ruleBinding) {
      this.logger.warn(`Task ${task.id} completed without evidence and violates '${ruleBinding.rule.name}'!`);
      
      // Auto-flag violation
      await this.prisma.complianceViolation.create({
        data: {
          companyId: task.companyId,
          ruleId: ruleBinding.rule.id,
          entityType: 'Task',
          entityId: task.id,
          status: 'Open',
          severity: ruleBinding.rule.severity,
          reportedById: null, // System generated
          resolutionRemarks: 'Auto-flagged by Automated Compliance Engine: Task marked completed without required evidence.',
        },
      });
    }
  }
}
