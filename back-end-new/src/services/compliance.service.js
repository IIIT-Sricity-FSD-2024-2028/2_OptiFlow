import { prisma } from '../config/prisma.js';

async function findApplicableComplianceRules(taskId, projectOrTask) {
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

  const scopeConditions = [];
  if (companyId) scopeConditions.push({ scopeType: 'Company', scopeId: companyId });
  if (branchId) scopeConditions.push({ scopeType: 'Branch', scopeId: branchId });
  if (teamId) scopeConditions.push({ scopeType: 'Team', scopeId: teamId });
  if (projectId) scopeConditions.push({ scopeType: 'Project', scopeId: projectId });

  if (scopeConditions.length === 0) return [];

  const bindings = await prisma.complianceBinding.findMany({
    where: { OR: scopeConditions },
    include: {
      rule: {
        include: { category: true }
      }
    }
  });

  const uniqueRulesMap = new Map();
  for (const binding of bindings) {
    if (binding.rule && !uniqueRulesMap.has(binding.rule.id)) {
      uniqueRulesMap.set(binding.rule.id, binding.rule);
    }
  }
  return Array.from(uniqueRulesMap.values());
}

/**
 * Checks whether a subtask submission for review requires attached/existing evidence
 * (Pending, Under_Review, or Approved) under active EVIDENCE_REQUIRED rules.
 */
export async function evaluateSubtaskSubmission(taskId, projectOrTask) {
  const rules = await findApplicableComplianceRules(taskId, projectOrTask);
  const evidenceRules = rules.filter(
    (rule) => rule.isActive && rule.criteria?.requirement?.type === 'EVIDENCE_REQUIRED'
  );
  if (evidenceRules.length === 0) {
    return { allowed: true, failedRules: [] };
  }

  const submittedCount = await prisma.complianceEvidence.count({
    where: {
      taskId,
      status: { in: ['Pending', 'Under_Review', 'Approved'] },
    },
  });

  if (submittedCount > 0) {
    return { allowed: true, failedRules: [] };
  }

  return {
    allowed: false,
    failedRules: evidenceRules,
  };
}

/**
 * Intercepts a task update and evaluates all relevant compliance rules across
 * all scopes (Company -> Branch -> Team -> Project).
 * @param {string} taskId 
 * @param {string|object} projectOrTask Project ID or loaded task object with relations
 * @param {object} proposedChanges 
 * @returns {Promise<{ allowed: boolean, failedRules: Array }>}
 */
export async function evaluateTaskTransition(taskId, projectOrTask, proposedChanges) {
  if (!proposedChanges.status) {
    return { allowed: true, failedRules: [] };
  }

  const rules = await findApplicableComplianceRules(taskId, projectOrTask);
  if (rules.length === 0) {
    return { allowed: true, failedRules: [] };
  }

  const activeViolations = [];

  for (const rule of rules) {
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
        const ruleCatName = rule.category?.name || '';
        const ruleCatId = rule.categoryId || '';
        const targetStr = String(targetCategory).toLowerCase();

        // SEC-M1-11: Match category via violation, rule's own category, or evidenceType
        const matchesViolationCat =
          evCatName.toLowerCase() === targetStr || evCatId === targetCategory;
        const matchesRuleCat =
          ruleCatName.toLowerCase() === targetStr || ruleCatId === targetCategory;
        const matchesEvidenceType =
          String(ev.evidenceType || '').toLowerCase() === targetStr;

        matchesCategory = matchesViolationCat || matchesRuleCat || matchesEvidenceType;
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

  // SEC-M1-10: Evidence must explicitly match rule or category; do not fall back to generic evidence
  return false;
}

const ACTIVE_VIOLATION_STATUSES = ['Open', 'Under_Review'];

/**
 * Calculates standard SLA due date based on rule severity:
 * - Critical: 24 hours
 * - High: 72 hours (3 days)
 * - Medium: 7 days
 * - Low: 14 days
 */
export function calculateSlaDueDate(severity, fromDate = new Date()) {
  const d = new Date(fromDate);
  switch (severity) {
    case 'Critical':
      d.setHours(d.getHours() + 24);
      break;
    case 'High':
      d.setHours(d.getHours() + 72);
      break;
    case 'Medium':
      d.setDate(d.getDate() + 7);
      break;
    case 'Low':
    default:
      d.setDate(d.getDate() + 14);
      break;
  }
  return d;
}

/**
 * Opens a violation for (rule, entity) unless an active one already exists. The database also
 * enforces this with a partial unique index, so two concurrent callers cannot both insert.
 * @param {object} client prisma client or transaction client
 * @returns {Promise<{ violation: object, created: boolean }>}
 */
export async function recordViolationOnce(client, data) {
  const where = {
    ruleId: data.ruleId,
    entityType: data.entityType,
    entityId: data.entityId,
    status: { in: ACTIVE_VIOLATION_STATUSES },
  };
  const existing = await client.complianceViolation.findFirst({ where });
  if (existing) return { violation: existing, created: false };
  try {
    const insertData = {
      status: 'Open',
      ...data,
    };
    if (!insertData.dueDate) {
      insertData.dueDate = calculateSlaDueDate(data.severity || 'Medium');
    }
    const violation = await client.complianceViolation.create({ data: insertData });
    return { violation, created: true };
  } catch (err) {
    if (err?.code === 'P2002') {
      const winner = await client.complianceViolation.findFirst({ where });
      if (winner) return { violation: winner, created: false };
    }
    throw err;
  }
}
