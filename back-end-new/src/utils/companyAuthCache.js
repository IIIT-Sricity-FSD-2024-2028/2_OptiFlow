import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { pickCurrentSubscription, evaluateSubscriptionAccess } from './subscriptions.js';

/**
 * Short-lived, per-process cache of the company facts tenant auth needs on every request:
 * company status and the current subscription (with plan limits).
 *
 * - TTL is AUTH_STATUS_CACHE_TTL_MS (default 30s), so a Suspend / Close / subscription change made
 *   on another instance takes effect within that window.
 * - On this instance, platform mutations call invalidateCompanyAuthCache() so they take effect at once.
 */
const cache = new Map();

async function loadCompanyAuthState(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      legalName: true,
      status: true,
      subscriptions: { include: { plan: true } },
    },
  });
  if (!company) return null;

  const subscription = pickCurrentSubscription(company.subscriptions);
  return {
    id: company.id,
    legalName: company.legalName,
    status: company.status,
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          updatedAt: subscription.updatedAt,
          plan: subscription.plan
            ? {
                id: subscription.plan.id,
                name: subscription.plan.name,
                maxUsers: subscription.plan.maxUsers,
                maxBranches: subscription.plan.maxBranches,
                maxActiveProcessTemplates: subscription.plan.maxActiveProcessTemplates,
                maxComplianceRules: subscription.plan.maxComplianceRules,
                allowsIntegrations: subscription.plan.allowsIntegrations,
              }
            : null,
        }
      : null,
  };
}

export async function getCompanyAuthState(companyId) {
  const now = Date.now();
  const hit = cache.get(companyId);
  if (hit && hit.expiresAt > now) return hit.value;

  const value = await loadCompanyAuthState(companyId);
  if (env.AUTH_STATUS_CACHE_TTL_MS > 0) {
    cache.set(companyId, { value, expiresAt: now + env.AUTH_STATUS_CACHE_TTL_MS });
  }
  return value;
}

/** Access decision for a company state (company status is checked by the caller). */
export function getCompanyEntitlement(state, now = new Date()) {
  return evaluateSubscriptionAccess(state?.subscription || null, now);
}

/** Drop one company's cached state, or everything when called without an id (e.g. plan edits). */
export function invalidateCompanyAuthCache(companyId) {
  if (companyId) cache.delete(companyId);
  else cache.clear();
}
