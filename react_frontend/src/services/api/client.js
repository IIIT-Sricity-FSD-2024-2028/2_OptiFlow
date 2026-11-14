// WHY: Every request in the app goes through apiRequest so auth, errors, timeouts and the
// response envelope are handled in exactly one place.
//
// What this client guarantees (SEC-M2-11 / 18 / 19):
//  * Failures throw an ApiError that keeps status, code, message and details. Pages branch on
//    `err.code` (for example COMPLIANCE_BLOCK) instead of matching message text.
//  * `{ success, data }` is unwrapped by shape, so data of 0, false, null or "" is returned as is
//    (the old `data?.data || data` handed back the whole envelope for those values).
//  * 204 / empty bodies return null instead of throwing on JSON parsing.
//  * Every request has a timeout (default 30 s, `timeout` option) and can be tied to an
//    `abortKey`: starting a new request with the same key cancels the older one, so a slow stale
//    response cannot overwrite fresh data.
//  * A 401 clears the session and sends the user to /login only when a session existed and the
//    user is not already on a public page. A 402 (trial/subscription problem) never logs the user
//    out silently: it raises a visible "plan" notice (see app/ApiEventsBridge).

import { getToken, clearSession } from '../auth/session';
import { PATHS } from '../../app/paths';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const API_EVENT = 'optiflow:api-event';
const DEFAULT_TIMEOUT_MS = 30000;

export class ApiError extends Error {
  constructor(message, { status = 0, code = null, details = null, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.data = data;
  }
}

export const isAbortError = (err) => err instanceof ApiError && err.code === 'ABORTED';

// Pages that work without a session. A 401 here must never bounce the user anywhere.
const PUBLIC_PATHS = Object.values(PATHS.PUBLIC || {}).filter((p) => typeof p === 'string');
const isPublicPage = () => {
  const path = window.location.pathname;
  return path === '/' || PUBLIC_PATHS.some((p) => p === path || (p.length > 1 && path.startsWith(`${p}/`)));
};

const emit = (type, detail) => {
  try {
    window.dispatchEvent(new CustomEvent(API_EVENT, { detail: { type, ...detail } }));
  } catch {
    /* non-browser environment */
  }
};

export const buildUrl = (endpoint) => {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
  return API_URL.endsWith('/api') && clean.startsWith('/api/')
    ? `${API_URL}${clean.slice(4)}`
    : `${API_URL}${clean}`;
};

const inflight = new Map(); // abortKey -> AbortController

// Success bodies look like { success, data, ...meta }. Unwrap by shape, not by truthiness.
const unwrap = (body) => {
  if (body && typeof body === 'object' && !Array.isArray(body) && Object.prototype.hasOwnProperty.call(body, 'data')) {
    return body.data;
  }
  return body;
};

const parseBody = async (response) => {
  if (response.status === 204 || response.status === 205) return null;
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const toError = (response, body) => {
  const code =
    (body && typeof body.code === 'string' && body.code) ||
    (body && typeof body.error === 'string' && body.error) ||
    null;
  const details =
    (body && (body.details ?? body.violations ?? body.errors)) ?? null;
  const message = (body && body.message) || `Error ${response.status}: Request failed`;
  return new ApiError(message, { status: response.status, code, details, data: body });
};

export const apiRequest = async (endpoint, options = {}) => {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    abortKey,
    skipAuthRedirect = false,
    signal: callerSignal,
    headers: extraHeaders,
    body: rawBody,
    method: rawMethod,
    ...fetchOptions
  } = options;

  const token = getToken();
  const method = (rawMethod || (rawBody !== undefined ? 'POST' : 'GET')).toUpperCase();
  const isFormData = typeof FormData !== 'undefined' && rawBody instanceof FormData;

  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };

  const body =
    rawBody !== undefined && rawBody !== null && typeof rawBody === 'object' && !isFormData
      ? JSON.stringify(rawBody)
      : rawBody;

  // Abort handling: our own controller covers timeout + abortKey; a caller signal is chained in.
  const controller = new AbortController();
  let timedOut = false;
  const timer = timeout > 0 ? setTimeout(() => { timedOut = true; controller.abort(); }, timeout) : null;
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  if (abortKey) {
    inflight.get(abortKey)?.abort();
    inflight.set(abortKey, controller);
  }

  let response;
  try {
    response = await fetch(buildUrl(endpoint), {
      credentials: 'include',
      ...fetchOptions,
      method,
      headers,
      signal: controller.signal,
      ...(body !== undefined ? { body } : {}),
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw timedOut
        ? new ApiError('The request took too long. Please try again.', { code: 'TIMEOUT' })
        : new ApiError('Request cancelled', { code: 'ABORTED' });
    }
    throw new ApiError('Cannot reach the server. Check your connection and try again.', { code: 'NETWORK_ERROR' });
  } finally {
    if (timer) clearTimeout(timer);
    if (abortKey && inflight.get(abortKey) === controller) inflight.delete(abortKey);
  }

  const parsed = await parseBody(response);

  if (!response.ok) {
    const error = toError(response, parsed);

    if (response.status === 401 && !skipAuthRedirect) {
      const hadSession = Boolean(token);
      const isLoginCall = endpoint.includes('/auth/login');
      if (hadSession && !isLoginCall) {
        clearSession();
        if (!isPublicPage()) {
          window.location.assign(`${PATHS.PUBLIC.LOGIN}?reason=session_expired`);
        }
      }
    }

    // 402: the company's trial/subscription does not allow access. Do not hide it behind a
    // redirect to /login; tell the user why and let the app route them to billing.
    if (response.status === 402 && !endpoint.includes('/auth/login')) {
      emit('plan-blocked', { code: error.code, message: error.message });
    }

    throw error;
  }

  return unwrap(parsed);
};

// Kept so the ~240 existing call sites keep working unchanged.
export const apiClient = apiRequest;
