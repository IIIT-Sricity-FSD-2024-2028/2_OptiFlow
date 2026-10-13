import { prisma } from '../config/prisma.js';

/**
 * Intercepts a task update and evaluates all relevant compliance rules across
 * all scopes (Company -> Branch -> Team -> Project).
 * @param {string} taskId 
 * @param {string|object} projectOrTask Project ID or loaded task object with relations
 * @param {object} proposedChanges 
 * @returns {Promise<{ allowed: boolean, failedRules: Array }>}
 */
export async function evaluateTaskTransition(taskId, projectOrTask, proposedChanges) {
  // We only care if the status is changing
  if (!proposedChanges.status) {
    return { allowed: true, failedRules: [] };
  }

  // Resolve scope IDs (Company, Branch, Team, Project)
  let companyId = null;
  let projectId = null;
  let teamId = null;
  let branchId = null;

  if (typeof projectOrTask === 'object' && projectOrTask !== null) {
    companyId = projectOrTask.companyId || null;
    projectId = projectOrTask.projectId || null;
    teamId = projectOrTask.project?.teamId || null;
    branchId = projectOrTask.project?.team?.branchId || null;
  } else if (typeof projectOrTask === 'string') {
    projectId = projectOrTask;
  }

  // If any scope IDs are missing, query from DB
  if (!companyId || (projectId && (!teamId || !branchId))) {
    const taskRecord = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: { team: true }
        }
      }
    });

    if (taskRecord) {
      companyId = taskRecord.companyId;
      projectId = taskRecord.projectId;
      teamId = taskRecord.project?.teamId || null;
      branchId = taskRecord.project?.team?.branchId || null;
    }
  }

  // Build OR condition for all applicable scopes
  const scopeConditions = [];
  if (companyId) {
    scopeConditions.push({ scopeType: 'Company', scopeId: companyId });
  }
  if (branchId) {
    scopeConditions.push({ scopeType: 'Branch', scopeId: branchId });
  }
  if (teamId) {
    scopeConditions.push({ scopeType: 'Team', scopeId: teamId });
  }
  if (projectId) {
    scopeConditions.push({ scopeType: 'Project', scopeId: projectId });
  }

  if (scopeConditions.length === 0) {
    return { allowed: true, failedRules: [] };
  }

  // Fetch all rules bound to any applicable scope
  const bindings = await prisma.complianceBinding.findMany({
    where: {
      OR: scopeConditions
    },
    include: {
      rule: {
        include: {
          category: true
        }
      }
    }
  });

  // Deduplicate rules in case the same rule is bound to both Company and Project
  const uniqueRulesMap = new Map();
  for (const binding of bindings) {
    if (binding.rule && !uniqueRulesMap.has(binding.rule.id)) {
      uniqueRulesMap.set(binding.rule.id, binding.rule);
    }
  }

  const activeViolations = [];

  for (const rule of uniqueRulesMap.values()) {
    if (!rule.isActive || !rule.criteria) continue;

    // Check if the criteria matches the proposed status transition
    const trigger = rule.criteria.trigger;
    if (trigger && trigger.field === 'status' && trigger.transitionTo === proposedChanges.status) {
      const requirement = rule.criteria.requirement;
      if (requirement && requirement.type === 'EVIDENCE_REQUIRED') {
        const hasEvidence = await checkEvidenceForTask(taskId, requirement, rule);
        
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
 * Checks if the task has approved evidence meeting the rule requirement
 * @param {string} taskId 
 * @param {object} requirement 
 * @param {object} rule
 * @returns {Promise<boolean>}
 */
async function checkEvidenceForTask(taskId, requirement, rule) {
  // Query approved evidence submitted for this task
  const approvedEvidences = await prisma.complianceEvidence.findMany({
    where: {
      taskId: taskId,
      status: 'Approved'
    },
    include: {
      violation: {
        include: { rule: true }
      }
    }
  });

  if (approvedEvidences.length === 0) {
    return false;
  }

  // 1. If the requirement specifies a specific category or rule requires a category
  const targetCategory = requirement?.evidenceCategory || requirement?.category;
  const targetType = requirement?.evidenceType || requirement?.type_name;

  if (targetCategory || targetType) {
    return approvedEvidences.some(ev => {
      let matchesCategory = true;
      let matchesType = true;

      if (targetCategory) {
        const evCatName = ev.violation?.rule?.category?.name || '';
        const evCatId = ev.violation?.rule?.categoryId || '';
        matchesCategory =
          evCatName.toLowerCase() === String(targetCategory).toLowerCase() ||
          evCatId === targetCategory;
      }

      if (targetType) {
        matchesType = String(ev.evidenceType || '').toLowerCase() === String(targetType).toLowerCase();
      }

      return matchesCategory && matchesType;
    });
  }

  // 2. If the evidence was explicitly submitted against a violation for this rule
  const ruleSpecificEvidence = approvedEvidences.some(ev => ev.violation?.ruleId === rule.id);
  if (ruleSpecificEvidence) {
    return true;
  }

  // 3. Otherwise, any approved general task evidence qualifies
  return approvedEvidences.length > 0;
}
