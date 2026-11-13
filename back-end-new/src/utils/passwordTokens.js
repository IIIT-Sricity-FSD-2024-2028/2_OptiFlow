import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const SET_PASSWORD_PURPOSE = 'set_password';

/**
 * Builds a one-time set-password link for a tenant user.
 *
 * "One-time" is enforced by tokenVersion: the token embeds the user's current
 * tokenVersion, and redeeming it increments tokenVersion, so the same link (and every
 * session issued before it) stops working.
 *
 * The link is built from APP_BASE_URL, never from request headers (Host / Origin /
 * Referer can be spoofed and would let an attacker point invite links at their own site).
 */
export function buildSetPasswordLink({ userId, companyId, tokenVersion }) {
  const token = jwt.sign(
    { sub: userId, companyId, tokenVersion, purpose: SET_PASSWORD_PURPOSE },
    env.JWT_SECRET,
    { expiresIn: env.SET_PASSWORD_TOKEN_TTL },
  );
  const { exp } = jwt.decode(token);
  return {
    token,
    url: `${env.APP_BASE_URL}/set-password?token=${encodeURIComponent(token)}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}
