import { useEffect, useRef } from 'react';
import { API_EVENT } from '../services/api/client';
import { useToast } from '../shared/components/Toast';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../roles';
import { PATHS } from './paths';
import { router } from './router';

// WHY (SEC-M2-11): when the company's trial or subscription is no longer valid the API answers
// 402 with a code. The client used to treat every failure like "not logged in" and dump the user on
// /login with no explanation. This bridge turns the client's "plan-blocked" event into a visible
// notice and, for people who can fix it (owner / system admin), takes them to Billing.
const BILLING_ROLES = [ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN];
const NOTICE_COOLDOWN_MS = 8000;

export function ApiEventsBridge() {
  const toast = useToast();
  const { user } = useAuth();
  const lastShown = useRef(0);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    const onEvent = (e) => {
      if (e.detail?.type !== 'plan-blocked') return;
      const canFix = BILLING_ROLES.includes(userRef.current?.role);

      // Many requests fail at once when a plan lapses: show the notice once per cooldown,
      // but always keep people who can fix it on the Billing page.
      const now = Date.now();
      if (now - lastShown.current >= NOTICE_COOLDOWN_MS) {
        lastShown.current = now;
        toast.warning(
          e.detail.message ||
            (canFix
              ? 'Your plan is not active. Open Billing to renew or upgrade.'
              : "Your company's plan is not active. Please contact your administrator."),
          8000,
        );
      }
      if (canFix && router.state.location.pathname !== PATHS.EXECUTIVE.BILLING) {
        router.navigate(PATHS.EXECUTIVE.BILLING);
      }
    };
    window.addEventListener(API_EVENT, onEvent);
    return () => window.removeEventListener(API_EVENT, onEvent);
  }, [toast]);

  return null;
}
