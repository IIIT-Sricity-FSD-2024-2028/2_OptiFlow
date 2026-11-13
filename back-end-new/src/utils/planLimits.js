import { prisma } from '../config/prisma.js';
import { PlanLimitError } from './errors.js';
import { getCompanyAuthState } from './companyAuthCache.js';

/**
 * Central tenant-side plan limit enforcement.
 *
 * Over-limit behaviour (P0 decision): limits only block *new* creations / activations.
 * Existing data is never deleted or hidden when a plan's limit is lowered.
 *
 * A null limit means unlimited.
 */
const RESOURCES = {
  users: {
    planField: 'maxUsers',
    label: 'active users',
    count: (companyId, client) => client.user.count({ where: { companyId, isActive: true } }),
  },
  branches: {
    planField: 'maxBranches',
    label: 'branches',
    count: (companyId, client) => client.branch.count({ where: { companyId } }),
  },
  activeProcessTemplates: {
    planField: 'maxActiveProcessTemplates',
    label: 'active process templates',
    count: (companyId, client) => client.processTemplate.count({ where: { companyId, isActive: true } }),
  },
  complianceRules: {
    planField: 'maxComplianceRules',
    label: 'compliance rules',
    count: (companyId, client) => client.complianceRule.count({ where: { companyId } }),
  },
};

export async function getPlanLimit(companyId, resource) {
  const def = RESOURCES[resource];
  if (!def) throw new Error(`Unknown plan-limited resource: ${resource}`);
  const state = await getCompanyAuthState(companyId);
  const limit = state?.subscription?.plan?.[def.planField];
  return limit === undefined ? null : limit;
}

/**
 * Throws PlanLimitError (403, code PLAN_LIMIT_REACHED) if adding `adding` more of `resource`
 * would exceed the company's plan.
 */
export async function assertWithinPlanLimit(companyId, resource, { adding = 1, client = prisma } = {}) {
  const def = RESOURCES[resource];
  if (!def) throw new Error(`Unknown plan-limited resource: ${resource}`);

  const limit = await getPlanLimit(companyId, resource);
  if (limit === null) return;

  const current = await def.count(companyId, client);
  if (current + adding > limit) {
    throw new PlanLimitError(
      `Plan limit reached: your plan allows up to ${limit} ${def.label} (currently ${current}). Please upgrade your plan.`,
      { limit, current, resource },
    );
  }
}

/** Usage vs limits snapshot, e.g. for a future "Plan and usage" page. */
export async function getPlanUsage(companyId) {
  const out = {};
  for (const [key, def] of Object.entries(RESOURCES)) {
    out[key] = { limit: await getPlanLimit(companyId, key), current: await def.count(companyId, prisma) };
  }
  return out;
}
