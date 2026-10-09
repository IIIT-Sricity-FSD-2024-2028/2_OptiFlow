import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// The rule evaluators contain the actual "brains" of the automated compliance checks.
// Since rules are created dynamically by users, we match the rule's intention by keywords in its name.
// In a V2, we would add an `evaluatorType` enum to the ComplianceRule Prisma model.
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
      // Avoid duplicate active violations for the same entity + rule
      const existing = await prisma.complianceViolation.findFirst({
        where: { ruleId, entityType: 'Task', entityId: task.id, status: 'Open' }
      });

      if (!existing) {
        await prisma.complianceViolation.create({
          data: {
            companyId,
            ruleId,
            entityType: 'Task',
            entityId: task.id,
            status: 'Open',
            severity: 'Medium',
          }
        });
        newViolations++;
      }
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
      const existing = await prisma.complianceViolation.findFirst({
        where: { ruleId, entityType: 'Task', entityId: task.id, status: 'Open' }
      });

      if (!existing) {
        await prisma.complianceViolation.create({
          data: {
            companyId,
            ruleId,
            entityType: 'Task',
            entityId: task.id,
            status: 'Open',
            severity: 'High',
          }
        });
        newViolations++;
      }
    }
    return newViolations;
  }
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
    // Determine Evaluator based on keywords in Rule Name
    let evaluatorFunc = null;
    const ruleName = rule.name.toLowerCase();

    if (ruleName.includes('overdue')) {
      evaluatorFunc = EVALUATORS.checkOverdueTasks;
    } else if (ruleName.includes('unassigned') || ruleName.includes('assign')) {
      evaluatorFunc = EVALUATORS.checkUnassignedTasks;
    }

    if (!evaluatorFunc) {
      console.log(`[Compliance Engine] No evaluator found for rule: "${rule.name}"`);
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
