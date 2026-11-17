import { PrismaClient } from '@prisma/client';
import { recordViolationOnce } from '../services/compliance.service.js';
const prisma = new PrismaClient();

// The rule evaluators contain the actual "brains" of the automated compliance checks.
// A rule picks its evaluator through ComplianceRule.ruleType.
const EVALUATORS = {
  // Evaluator 1: Check for Overdue Tasks
  async checkOverdueTasks(companyId, ruleId, scopeType, scopeId) {
    console.log(`[Compliance Engine] Running checkOverdueTasks for company ${companyId}`);
    
    // We only care about Tasks for this specific company.
    // If Scope is 'User', we check tasks assigned to that user.
    // If Scope is 'Company', we check all tasks in the company.
    const whereClause = {
      companyId,
      status: { not: 'Completed' },
      dueDate: { lt: new Date() } // Overdue!
    };

    if (scopeType === 'User') {
      whereClause.assignedToId = scopeId;
    } else if (scopeType === 'Project') {
      whereClause.projectId = scopeId;
    }

    const overdueTasks = await prisma.task.findMany({ where: whereClause, select: { id: true } });
    
    // Record Violations
    let newViolations = 0;
    for (const task of overdueTasks) {
      const { created } = await recordViolationOnce(prisma, {
        companyId, ruleId, entityType: 'Task', entityId: task.id, severity: 'Medium',
      });
      if (created) newViolations++;
    }
    return newViolations;
  },

  // Evaluator 2: Check for Unassigned Tasks
  async checkUnassignedTasks(companyId, ruleId, scopeType, scopeId) {
    console.log(`[Compliance Engine] Running checkUnassignedTasks for company ${companyId}`);
    const whereClause = {
      companyId,
      status: { not: 'Completed' },
      assignedToId: null
    };

    if (scopeType === 'Project') {
      whereClause.projectId = scopeId;
    }

    const unassignedTasks = await prisma.task.findMany({ where: whereClause, select: { id: true } });
    let newViolations = 0;
    for (const task of unassignedTasks) {
      const { created } = await recordViolationOnce(prisma, {
        companyId, ruleId, entityType: 'Task', entityId: task.id, severity: 'High',
      });
      if (created) newViolations++;
    }
    return newViolations;
  }
};

const RULE_TYPE_EVALUATORS = {
  Overdue: EVALUATORS.checkOverdueTasks,
  Unassigned: EVALUATORS.checkUnassignedTasks,
};

export async function runComplianceEngine(companyId = null) {
  console.log('[Compliance Engine] Engine started...');
  let totalNewViolations = 0;

  // 1. Fetch all ACTIVE Rules that have Bindings
  const whereArgs = { isActive: true };
  if (companyId) whereArgs.companyId = companyId;

  const activeRules = await prisma.complianceRule.findMany({
    where: whereArgs,
    include: { bindings: true }
  });

  for (const rule of activeRules) {
    // The evaluator comes from the rule's declared type, never from its name.
    const evaluatorFunc = RULE_TYPE_EVALUATORS[rule.ruleType] || null;

    if (!evaluatorFunc) {
      // Custom rules are enforced by their criteria on task transitions, not by a scheduled check.
      continue;
    }

    // Run the evaluator for EVERY binding
    for (const binding of rule.bindings) {
      const violationsCount = await evaluatorFunc(rule.companyId, rule.id, binding.scopeType, binding.scopeId);
      totalNewViolations += violationsCount;
    }
  }

  console.log(`[Compliance Engine] Engine finished. Generated ${totalNewViolations} new violations.`);
  return { success: true, newViolations: totalNewViolations };
}
