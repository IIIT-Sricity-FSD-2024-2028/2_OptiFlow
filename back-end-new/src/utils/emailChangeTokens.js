import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { BadRequestError } from './errors.js';
import { sendEmail } from '../services/email.service.js';

export const EMAIL_CHANGE_PURPOSE = 'email_change';
const EMAIL_CHANGE_TTL = '1h';

/**
 * Builds a one-time link that confirms a new email address (SEC-M5-06).
 *
 * The token carries the new address and the user's current tokenVersion. Confirming it
 * increments tokenVersion, so the link works once, and a password change or sign-out-all
 * in between also kills it. The link is built from APP_BASE_URL, never from request headers.
 */
export function buildEmailChangeToken({ userId, companyId, tokenVersion, newEmail }) {
  const token = jwt.sign(
    { sub: userId, companyId, tokenVersion, newEmail, purpose: EMAIL_CHANGE_PURPOSE },
    env.JWT_SECRET,
    { expiresIn: EMAIL_CHANGE_TTL },
  );
  return {
    token,
    url: `${env.APP_BASE_URL}/confirm-email?token=${encodeURIComponent(token)}`,
  };
}

/** Returns the token payload, or throws BadRequestError for anything invalid or expired. */
export function verifyEmailChangeToken(token) {
  try {
    const payload = jwt.verify(String(token || ''), env.JWT_SECRET);
    if (payload?.purpose !== EMAIL_CHANGE_PURPOSE || !payload.sub || !payload.newEmail) {
      throw new Error('wrong purpose');
    }
    return payload;
  } catch {
    throw new BadRequestError('This email confirmation link is invalid or has expired');
  }
}

/** Sends the confirmation link to the NEW address only. Never throws. */
export function sendEmailChangeConfirmation({ to, fullName, url }) {
  return sendEmail({
    to,
    subject: 'Confirm your new OptiFlow email address',
    text: [
      `Hi ${fullName},`,
      '',
      'Someone asked to use this address for an OptiFlow account. Confirm the change with the link below:',
      '',
      url,
      '',
      `The link works once and expires in ${EMAIL_CHANGE_TTL}. If you did not ask for this, ignore this email.`,
    ].join('\n'),
  });
}

/** Tells the OLD address that its account email was changed. Never throws. */
export function sendEmailChangedNotice({ to, fullName, newEmail }) {
  return sendEmail({
    to,
    subject: 'Your OptiFlow email address was changed',
    text: [
      `Hi ${fullName},`,
      '',
      `The email address of your OptiFlow account was changed to ${newEmail} and all sessions were signed out.`,
      'If you did not make this change, contact your administrator immediately.',
    ].join('\n'),
  });
}
