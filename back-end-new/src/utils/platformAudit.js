import { prisma as globalPrisma } from '../config/prisma.js';
import { UnauthorizedError } from './errors.js';

/**
 * Deep redaction helper that recursively redacts sensitive fields:
 * - passwordHash
 * - any key containing 'password' (case-insensitive)
 * - any key containing 'token' (case-insensitive)
 * - any key containing 'secret' (case-insensitive)
 */
export function redactSensitiveData(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }

  const redacted = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === 'passwordhash' ||
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret')
    ) {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Appends a PlatformAuditLog record.
 * Append-only in code: no update or delete functions exist.
 *
 * @param {object} req - Express request with req.platformAdmin
 * @param {string} action - Convention "<entity>.<verb>" (e.g. "plan.create")
 * @param {{ type: string, id: string, companyId?: string|null }} entity
 * @param {object|null} [before=null] - State before mutation
 * @param {object|null} [after=null] - State after mutation
 * @param {object} [tx] - Optional Prisma transaction client
 * @returns {Promise<object>} The created PlatformAuditLog record
 */
export async function writeAuditLog(req, action, entity, before = null, after = null, tx = null) {
  const adminUserId = req?.platformAdmin?.id;
  if (!adminUserId) {
    throw new UnauthorizedError('Platform audit log requires a verified platform admin auth context');
  }

  if (!action || typeof action !== 'string') {
    throw new Error('Audit action is required and must follow the <entity>.<verb> convention');
  }

  if (!entity || !entity.type || !entity.id) {
    throw new Error('Audit entity must provide type and id');
  }

  const client = tx || globalPrisma;

  const redactedBefore = before ? redactSensitiveData(before) : null;
  const redactedAfter = after ? redactSensitiveData(after) : null;

  const ip = req.ip || req.socket?.remoteAddress || null;

  return await client.platformAuditLog.create({
    data: {
      adminUserId,
      action,
      entityType: entity.type,
      entityId: String(entity.id),
      companyId: entity.companyId || null,
      before: redactedBefore,
      after: redactedAfter,
      ip,
    },
  });
}
