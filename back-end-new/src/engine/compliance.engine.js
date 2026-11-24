import { prisma } from '../config/prisma.js';
import { recordViolationOnce } from '../services/compliance.service.js';
import { createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';
import { checkAndEscalateViolationSlas } from '../controllers/compliance-violations.controller.js';

/**
 * Builds the Prisma where-clause for a task given a binding scope (SEC-M1-13).
 * ScopeType enum: Company | Branch | Team | Project
 */
function buildTaskScopeFilter(scopeType, scopeId) {
  switch (scopeType) {
    case 'Branch':
      return { project: { team: { branchId: scopeId } } };
    case 'Team':
      return { project: { teamId: scopeId } };
    case 'Project':
      return { projectId: scopeId };
    case 'Company':
    default:
      return {};
  }
}

// The rule evaluators contain the automated compliance checks.
// Evaluator selection is strictly driven by ComplianceRule.ruleType (SEC-M1-13).
const EVALUATORS = {
  /**
   * Evaluator 1: Check for Overdue Tasks
   * - Ignores Completed and Cancelled tasks
   * - Filters out soft-deleted tasks (deletedAt is null)
   * - Respects Company, Branch, Team, and Project scopes
   * - Inherits severity directly from rule.severity
   * - Auto-resolves active violations when overdue condition clears
   */
  async checkOverdueTasks(rule, scopeType, scopeId) {
    const companyId = rule.companyId;
    const scopeFilter = buildTaskScopeFilter(scopeType, scopeId);

    const whereClause = {
      companyId,
      deletedAt: null,
      status: { notIn: ['Completed', 'Cancelled'] },
      dueDate: { lt: new Date() },
      ...scopeFilter,
    };

    const overdueTasks = await prisma.task.findMany({
      where: whereClause,
      select: { id: true },
    });
    const overdueTaskIds = new Set(overdueTasks.map((t) => t.id));

    // 1. Record violations for failing tasks
    let newViolations = 0;
    for (const taskId of overdueTaskIds) {
      const { created } = await recordViolationOnce(prisma, {
        companyId,
        ruleId: rule.id,
        entityType: 'Task',
        entityId: taskId,
        severity: rule.severity || 'Medium',
      });
      if (created) newViolations++;
    }

    // 2. Auto-resolve active violations whose condition has cleared (SEC-M1-13)
    let resolvedViolations = 0;
    const activeViolations = await prisma.complianceViolation.findMany({
      where: {
        companyId,
        ruleId: rule.id,
        entityType: 'Task',
        status: { in: ['Open', 'Under_Review'] },
      },
      select: { id: true, entityId: true },
    });

    for (const violation of activeViolations) {
      const task = await prisma.task.findFirst({
        where: {
          id: violation.entityId,
          companyId,
          ...scopeFilter,
        },
        select: { id: true, status: true, dueDate: true, deletedAt: true },
      });

      const isStillOverdue =
        task &&
        !task.deletedAt &&
        !['Completed', 'Cancelled'].includes(task.status) &&
        task.dueDate &&
        new Date(task.dueDate) < new Date();

      if (!isStillOverdue) {
        await prisma.complianceViolation.update({
          where: { id: violation.id },
          data: {
            status: 'Resolved',
            resolvedAt: new Date(),
            resolutionRemarks: 'Auto-resolved by compliance engine: overdue condition cleared.',
          },
        });

        try {
          await createComplianceAuditLog({
            companyId,
            ruleId: rule.id,
            violationId: violation.id,
            action: AUDIT_ACTIONS.STATUS_CHANGE,
            performedById: null,
            newValue: { status: 'Resolved', reason: 'Auto-resolved: task no longer overdue or completed' },
          });
        } catch (auditErr) {
          console.warn('[Compliance Engine] Failed to record auto-resolve audit log:', auditErr.message);
        }

        resolvedViolations++;
      }
    }

    return { newViolations, resolvedViolations };
  },

  /**
   * Evaluator 2: Check for Unassigned Tasks
   * - Ignores Completed and Cancelled tasks
   * - Filters out soft-deleted tasks (deletedAt is null)
   * - Respects Company, Branch, Team, and Project scopes
   * - Inherits severity directly from rule.severity
   * - Auto-resolves active violations when task is assigned or closed
   */
  async checkUnassignedTasks(rule, scopeType, scopeId) {
    const companyId = rule.companyId;
    const scopeFilter = buildTaskScopeFilter(scopeType, scopeId);

    const whereClause = {
      companyId,
      deletedAt: null,
      status: { notIn: ['Completed', 'Cancelled'] },
      assignedToId: null,
      ...scopeFilter,
    };

    const unassignedTasks = await prisma.task.findMany({
      where: whereClause,
      select: { id: true },
    });
    const unassignedTaskIds = new Set(unassignedTasks.map((t) => t.id));

    // 1. Record violations for unassigned tasks
    let newViolations = 0;
    for (const taskId of unassignedTaskIds) {
      const { created } = await recordViolationOnce(prisma, {
        companyId,
        ruleId: rule.id,
        entityType: 'Task',
        entityId: taskId,
        severity: rule.severity || 'High',
      });
      if (created) newViolations++;
    }

    // 2. Auto-resolve active violations whose condition has cleared (SEC-M1-13)
    let resolvedViolations = 0;
    const activeViolations = await prisma.complianceViolation.findMany({
      where: {
        companyId,
        ruleId: rule.id,
        entityType: 'Task',
        status: { in: ['Open', 'Under_Review'] },
      },
      select: { id: true, entityId: true },
    });

    for (const violation of activeViolations) {
      const task = await prisma.task.findFirst({
        where: {
          id: violation.entityId,
          companyId,
          ...scopeFilter,
        },
        select: { id: true, assignedToId: true, status: true, deletedAt: true },
      });

      const isStillUnassigned =
        task &&
        !task.deletedAt &&
        !['Completed', 'Cancelled'].includes(task.status) &&
        !task.assignedToId;

      if (!isStillUnassigned) {
        await prisma.complianceViolation.update({
          where: { id: violation.id },
          data: {
            status: 'Resolved',
            resolvedAt: new Date(),
            resolutionRemarks: 'Auto-resolved by compliance engine: task has been assigned or closed.',
          },
        });

        try {
          await createComplianceAuditLog({
            companyId,
            ruleId: rule.id,
            violationId: violation.id,
            action: AUDIT_ACTIONS.STATUS_CHANGE,
            performedById: null,
            newValue: { status: 'Resolved', reason: 'Auto-resolved: task assigned or closed' },
          });
        } catch (auditErr) {
          console.warn('[Compliance Engine] Failed to record auto-resolve audit log:', auditErr.message);
        }

        resolvedViolations++;
      }
    }

    return { newViolations, resolvedViolations };
  },
};

const RULE_TYPE_EVALUATORS = {
  Overdue: EVALUATORS.checkOverdueTasks,
  Unassigned: EVALUATORS.checkUnassignedTasks,
};

export async function runComplianceEngine(companyId = null) {
  console.log('[Compliance Engine] Engine started...');
  let totalNewViolations = 0;
  let totalResolvedViolations = 0;

  // 1. Fetch all ACTIVE Rules that have Bindings
  const whereArgs = { isActive: true };
  if (companyId) whereArgs.companyId = companyId;

  const activeRules = await prisma.complianceRule.findMany({
    where: whereArgs,
    include: { bindings: true },
  });

  for (const rule of activeRules) {
    // The evaluator comes from the rule's declared type, never from its name (SEC-M1-13).
    const evaluatorFunc = RULE_TYPE_EVALUATORS[rule.ruleType] || null;

    if (!evaluatorFunc) {
      // Custom rules are enforced by their criteria on task transitions, not by scheduled batch checks.
      continue;
    }

    // Run the evaluator for EVERY binding
    for (const binding of rule.bindings) {
      const { newViolations, resolvedViolations } = await evaluatorFunc(
        rule,
        binding.scopeType,
        binding.scopeId
      );
      totalNewViolations += newViolations;
      totalResolvedViolations += resolvedViolations;
    }
  }

  console.log(
    `[Compliance Engine] Engine finished. Generated ${totalNewViolations} new violations, auto-resolved ${totalResolvedViolations}.`
  );

  let escalatedViolations = 0;
  if (companyId) {
    try {
      escalatedViolations = await checkAndEscalateViolationSlas(companyId);
    } catch (escErr) {
      console.warn('[Compliance Engine] Notice: SLA escalation check:', escErr.message);
    }
  }

  return {
    success: true,
    newViolations: totalNewViolations,
    resolvedViolations: totalResolvedViolations,
    escalatedViolations,
  };
}
