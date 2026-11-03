import { prisma as globalPrisma } from '../config/prisma.js';
import { env } from '../config/env.js';

/** Statuses that represent a subscription the company is still "on". */
export const LIVE_SUBSCRIPTION_STATUSES = ['Active', 'Trialing', 'PastDue'];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The single definition of a company's "current subscription":
 * the live (Active / Trialing / PastDue) subscription with the latest period end;
 * if none is live, the most recent subscription of any status (so callers can still
 * tell "cancelled" apart from "never subscribed"); otherwise null.
 */
export function pickCurrentSubscription(subscriptions = []) {
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) return null;
  const byRecency = [...subscriptions].sort((a, b) => {
    const d = new Date(b.currentPeriodEnd) - new Date(a.currentPeriodEnd);
    if (d !== 0) return d;
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });
  return byRecency.find((s) => LIVE_SUBSCRIPTION_STATUSES.includes(s.status)) || byRecency[0];
}

export async function getCurrentSubscription(companyId, client = globalPrisma) {
  const subs = await client.subscription.findMany({
    where: { companyId },
    include: { plan: true },
  });
  return pickCurrentSubscription(subs);
}

/**
 * Read-time entitlement decision for a subscription. Does not write anything:
 * a stored status of Active past its period end is *treated* as past due here,
 * so access is correct even before a lifecycle job exists.
 *
 * Returns { allowed, effectiveStatus, code, message, graceEndsAt }.
 */
export function evaluateSubscriptionAccess(subscription, now = new Date()) {
  if (!subscription) {
    return {
      allowed: false,
      effectiveStatus: 'None',
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'Your organization has no subscription. Contact OptiFlow support to activate a plan.',
    };
  }

  const periodEnd = new Date(subscription.currentPeriodEnd);
  const graceEndsAt = new Date(periodEnd.getTime() + env.SUBSCRIPTION_GRACE_DAYS * DAY_MS);

  switch (subscription.status) {
    case 'Cancelled':
      return {
        allowed: false,
        effectiveStatus: 'Cancelled',
        code: 'SUBSCRIPTION_CANCELLED',
        message: 'Your organization\'s subscription has been cancelled.',
      };
    case 'Trialing':
      if (now > periodEnd) {
        return {
          allowed: false,
          effectiveStatus: 'TrialExpired',
          code: 'TRIAL_EXPIRED',
          message: 'Your free trial has ended. Please upgrade your plan to continue.',
        };
      }
      return { allowed: true, effectiveStatus: 'Trialing' };
    case 'Active':
      if (now <= periodEnd) return { allowed: true, effectiveStatus: 'Active' };
    // Active but the period has ended without renewal: behaves like PastDue.
    // falls through
    case 'PastDue':
      if (now <= graceEndsAt) {
        return { allowed: true, effectiveStatus: 'PastDue', graceEndsAt: graceEndsAt.toISOString() };
      }
      return {
        allowed: false,
        effectiveStatus: 'PastDue',
        code: 'SUBSCRIPTION_PAST_DUE',
        message: 'Your subscription is past due and the grace period has ended. Please contact billing.',
        graceEndsAt: graceEndsAt.toISOString(),
      };
    default:
      return {
        allowed: false,
        effectiveStatus: String(subscription.status),
        code: 'SUBSCRIPTION_INVALID',
        message: 'Your organization\'s subscription is not in a usable state.',
      };
  }
}
