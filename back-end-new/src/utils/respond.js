/**
 * Shared success-response helpers (PRE-M2-01 / A4).
 *
 * Every success body has the same outer shape:
 *   { success: true, message: string, data: <payload> }
 *
 * Every list body has the same `data` shape, paginated or not:
 *   data: { items, total, page, pageSize, summary? }
 *
 * `summary` carries page-independent totals (for example counts per status)
 * and is present only when the endpoint computes them.
 *
 * Errors are produced by middleware/errorHandler.js and are not built here.
 */
import { formatListResponse } from "./pagination.js";

const DEFAULT_MESSAGES = { 200: "OK", 201: "Created" };

/**
 * Core sender. Always writes `success`, `message` and `data`.
 */
export function respond(res, { status = 200, message, data = null } = {}) {
  return res.status(status).json({
    success: true,
    message: message || DEFAULT_MESSAGES[status] || "OK",
    data,
  });
}

/** 200 with a payload. */
export function ok(res, data = null, message) {
  return respond(res, { status: 200, message, data });
}

/** 201 with the created resource. */
export function created(res, data = null, message) {
  return respond(res, { status: 201, message, data });
}

/**
 * 200 list response in the single list shape.
 *
 * Paginated:   okList(res, rows, { total, page, pageSize, summary })
 * Unpaginated: okList(res, rows, { summary })  -> one page holding every row
 */
export function okList(res, items, opts = {}) {
  const { total = items.length, page = 1, pageSize, summary, message } = opts;
  const extra = summary === undefined ? {} : { summary };
  return respond(res, {
    status: 200,
    message,
    data: formatListResponse(
      items,
      total,
      page,
      pageSize ?? Math.max(items.length, 1),
      extra,
    ),
  });
}
