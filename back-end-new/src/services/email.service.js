import { env } from '../config/env.js';

/**
 * Transactional email service.
 *
 * Providers (EMAIL_PROVIDER):
 *  - console  (default) : logs the message to stdout. For local development only.
 *  - resend             : sends via the Resend HTTP API (RESEND_API_KEY). No extra npm dependency.
 *  - disabled           : drops every message (useful for tests).
 *
 * sendEmail() never throws. It resolves to { delivered, provider, error? } so callers
 * (e.g. company provisioning) can report delivery status without failing the mutation.
 */

const providers = {
  async console(message) {
    const bar = '-'.repeat(72);
    console.log(
      `\n${bar}\n[Email:console] To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n${bar}\n`,
    );
    return { delivered: true };
  },

  async resend(message) {
    if (!env.RESEND_API_KEY) {
      return { delivered: false, error: 'RESEND_API_KEY is not configured' };
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { delivered: false, error: `Resend API error ${res.status}: ${body.slice(0, 200)}` };
    }
    return { delivered: true };
  },

  async disabled() {
    return { delivered: false, error: 'Email delivery is disabled' };
  },
};

export async function sendEmail({ to, subject, text, html }) {
  const providerName = providers[env.EMAIL_PROVIDER] ? env.EMAIL_PROVIDER : 'console';
  try {
    const result = await providers[providerName]({ to, subject, text, html: html || textToHtml(text) });
    if (!result.delivered && result.error) {
      console.warn(`[Email:${providerName}] Delivery to ${to} failed: ${result.error}`);
    }
    return { provider: providerName, ...result };
  } catch (err) {
    console.warn(`[Email:${providerName}] Delivery to ${to} failed: ${err.message}`);
    return { provider: providerName, delivered: false, error: err.message };
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textToHtml(text) {
  return `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5">${escapeHtml(text)
    .split('\n')
    .join('<br>')}</div>`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function sendOwnerInviteEmail({ to, ownerName, companyName, setPasswordUrl, expiresIn }) {
  return sendEmail({
    to,
    subject: `You're invited to OptiFlow: set up ${companyName}`,
    text: [
      `Hi ${ownerName},`,
      '',
      `An OptiFlow workspace has been created for ${companyName}, and you are its owner.`,
      'Use the link below to choose your password and sign in:',
      '',
      setPasswordUrl,
      '',
      `This link works once and expires in ${expiresIn}. If it expires, ask the OptiFlow team to send a new one.`,
      '',
      'If you were not expecting this email you can ignore it.',
    ].join('\n'),
  });
}

export function sendPasswordChangedEmail({ to, fullName }) {
  return sendEmail({
    to,
    subject: 'Your OptiFlow password was changed',
    text: [
      `Hi ${fullName},`,
      '',
      'The password for your OptiFlow account was just changed and all other sessions were signed out.',
      'If you did not make this change, contact your administrator immediately.',
    ].join('\n'),
  });
}
