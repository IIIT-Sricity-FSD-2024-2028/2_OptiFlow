import { ApiError } from './client';

// Request hygiene shared by the HR (M5) service wrappers.

const RESERVED_IDS = new Set(['__proto__', 'constructor', 'prototype']);
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// Every id in this schema is a UUID string. Anything else ("..", "", "a/b", "x?y", "__proto__")
// is refused before it can reach a URL path or a state key: the browser resolves "." and ".."
// segments, so encoding alone would still let ".." re-aim a request at a parent route.
export const isValidId = (id) => typeof id === 'string' && ID_PATTERN.test(id) && !RESERVED_IDS.has(id);

export function seg(id) {
  if (!isValidId(id)) throw new ApiError('Invalid id', { status: 0, code: 'BAD_ID' });
  return encodeURIComponent(id);
}

// Only the thunk's cancellation options are forwarded, and the method is always pinned, so a
// caller can never turn a read into a write or replace headers / auth handling.
export function req(options, method, body) {
  const out = { method };
  if (body !== undefined) out.body = body;
  if (options?.signal) out.signal = options.signal;
  if (options?.abortKey) out.abortKey = options.abortKey;
  return out;
}

// Runs a request builder; a refused id becomes a rejected promise, never a synchronous throw.
export function send(build) {
  try {
    return build();
  } catch (err) {
    return Promise.reject(err);
  }
}

export function withQuery(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
