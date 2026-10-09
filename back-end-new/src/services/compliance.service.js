import { prisma } from '../config/prisma.js';

/**
 * Intercepts a task update and evaluates all relevant compliance rules.
 * @param {string} taskId 
 * @param {string} projectId 
 * @param {object} proposedChanges 
 * @returns {Promise<{ allowed: boolean, failedRules: Array }>}
 */
export async function evaluateTaskTransition(taskId, projectId, proposedChanges) {
  // We only care if the status is changing
  if (!proposedChanges.status) {
    return { allowed: true, failedRules: [] };
  }

  // 1. Fetch all rules bound to this project (via ComplianceBinding)
  const bindings = await prisma.complianceBinding.findMany({
    where: { 
      scopeId: projectId,
      scopeType: 'Project'
    },
    include: { rule: true }
  });

  const activeViolations = [];

  for (const binding of bindings) {
    const rule = binding.rule;
    if (!rule.isActive || !rule.criteria) continue;

    // Check if the criteria matches the proposed status transition
    const trigger = rule.criteria.trigger;
    if (trigger && trigger.field === 'status' && trigger.transitionTo === proposedChanges.status) {
      
      const requirement = rule.criteria.requirement;
      if (requirement && requirement.type === 'EVIDENCE_REQUIRED') {
        const hasEvidence = await checkEvidenceForTask(taskId, requirement);
        
        if (!hasEvidence) {
          activeViolations.push(rule);
        }
      }
    }
  }

  return {
    allowed: activeViolations.length === 0,
    failedRules: activeViolations
  };
}

/**
 * Checks if the task has approved evidence meeting the requirement
 * @param {string} taskId 
 * @param {object} requirement 
 * @returns {Promise<boolean>}
 */
async function checkEvidenceForTask(taskId, requirement) {
  // Check for ANY approved evidence for this task if no specific category is required,
  // or specific evidence if a category name is given.
  // In a real implementation we might match category ID. 
  // Let's assume requirement.evidenceCategory is an optional string.
  
  const evidenceQuery = {
    taskId: taskId,
    status: 'Approved'
  };

  // If the requirement specifies a category name, maybe we should filter by it, 
  // but currently ComplianceEvidence doesn't link directly to ComplianceCategory, it links to Task and Violation.
  // We can just check if ANY approved evidence exists for this task.
  // Or check if the task has approved evidence related to the specific rule's violations...
  // For simplicity now, let's just ensure there's at least one approved evidence for the task.
  
  const approvedEvidenceCount = await prisma.complianceEvidence.count({
    where: evidenceQuery
  });

  return approvedEvidenceCount > 0;
}
