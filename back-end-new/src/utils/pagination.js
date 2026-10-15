import { ValidationError } from './errors.js';

/**
 * Shared List Contract Helper
 * Defines constants, query parser, deterministic order builder,
 * and paginated Prisma executor.
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_SEARCH_LENGTH = 100;

/**
 * Normalizes orderBy to ensure deterministic ordering with 'id' as a tiebreaker.
 *
 * @param {object|Array} orderBy - Caller's orderBy
 * @returns {Array} - Array of orderBy objects with id tiebreaker
 */
export function buildDeterministicOrderBy(orderBy = { createdAt: 'desc' }) {
  const orderList = Array.isArray(orderBy) ? [...orderBy] : [orderBy];

  const hasIdTiebreaker = orderList.some(
    (item) => item && typeof item === 'object' && 'id' in item
  );

  if (!hasIdTiebreaker) {
    orderList.push({ id: 'asc' });
  }

  return orderList;
}

/**
 * Parses and sanitizes list query params (?page, ?pageSize, ?q, ?status)
 *
 * @param {object} query - Express req.query
 * @param {object} [options]
 * @param {number} [options.defaultPage=1]
 * @param {number} [options.defaultPageSize=20]
 * @param {number} [options.maxPageSize=100]
 * @param {string[]} [options.allowedStatuses] - Optional allowlist for status
 * @returns {{
 *   page: number,
 *   pageSize: number,
 *   skip: number,
 *   take: number,
 *   q: string | undefined,
 *   status: string | undefined
 * }}
 */
export function parseListParams(query = {}, options = {}) {
  const defaultPage = options.defaultPage ?? DEFAULT_PAGE;
  const defaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  const maxPageSize = options.maxPageSize ?? MAX_PAGE_SIZE;

  // 1. Page: integer >= 1, defaults to defaultPage, clamped safely
  const rawPage = parseInt(query.page, 10);
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : defaultPage;

  // 2. PageSize: integer >= 1, default 20, max 100
  const rawPageSize = parseInt(query.pageSize, 10);
  let pageSize = Number.isInteger(rawPageSize) && rawPageSize >= 1
    ? rawPageSize
    : defaultPageSize;

  if (pageSize > maxPageSize) {
    pageSize = maxPageSize;
  }

  // 3. Skip / Take
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // 4. Search query (q): trimmed string, max 100 chars, empty becomes undefined
  let q;
  if (typeof query.q === 'string') {
    const trimmed = query.q.trim();
    if (trimmed.length > 0) {
      q = trimmed.length > MAX_SEARCH_LENGTH ? trimmed.slice(0, MAX_SEARCH_LENGTH) : trimmed;
    }
  }

  // 5. Status: optional; validated against allowedStatuses if provided
  let status;
  if (typeof query.status === 'string') {
    const trimmedStatus = query.status.trim();
    if (trimmedStatus.length > 0) {
      if (Array.isArray(options.allowedStatuses) && options.allowedStatuses.length > 0) {
        if (!options.allowedStatuses.includes(trimmedStatus)) {
          throw new ValidationError('Invalid status parameter', [
            {
              field: 'status',
              message: `Status must be one of: ${options.allowedStatuses.join(', ')}`,
            },
          ]);
        }
      }
      status = trimmedStatus;
    }
  }

  return {
    page,
    pageSize,
    skip,
    take,
    q,
    status,
  };
}

/**
 * Builds the standard list contract response envelope
 */
export function formatListResponse(items, total, page, pageSize, extra = {}) {
  return {
    items,
    total,
    page,
    pageSize,
    ...extra,
  };
}

/**
 * Builds a search where clause across multiple fields using case-insensitive contains.
 *
 * @param {string|undefined} q
 * @param {string[]} searchFields
 * @returns {object} Prisma where condition
 */
export function buildSearchWhere(q, searchFields = []) {
  if (!q || !Array.isArray(searchFields) || searchFields.length === 0) {
    return {};
  }

  return {
    OR: searchFields.map((field) => ({
      [field]: { contains: q, mode: 'insensitive' },
    })),
  };
}

/**
 * High-level Prisma pagination executor
 *
 * @param {object} prismaModel
 * @param {object} queryParams - Express req.query
 * @param {object} queryArgs - { where, include, select, orderBy }
 * @param {object} [options] - { allowedStatuses, searchFields, defaultPageSize, maxPageSize }
 */
export async function paginatePrisma(prismaModel, queryParams = {}, queryArgs = {}, options = {}) {
  const { page, pageSize, skip, take, q, status } = parseListParams(queryParams, options);

  let where = { ...(queryArgs.where || {}) };

  if (status) {
    where.status = status;
  }

  if (q && options.searchFields) {
    const searchCondition = buildSearchWhere(q, options.searchFields);
    if (searchCondition.OR) {
      where = {
        ...where,
        ...searchCondition,
      };
    }
  }

  const orderBy = buildDeterministicOrderBy(queryArgs.orderBy);

  const [items, total] = await Promise.all([
    prismaModel.findMany({
      ...queryArgs,
      where,
      skip,
      take,
      orderBy,
    }),
    prismaModel.count({
      where,
    }),
  ]);

  return {
    ...formatListResponse(items, total, page, pageSize),
    q,
    status,
  };
}
