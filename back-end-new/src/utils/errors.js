/**
 * Standard Application HTTP Error classes
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', errors = null) {
    super(message, 400, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource Not Found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict with existing resource') {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400, errors);
  }
}

/**
 * 402 Payment Required: the tenant's subscription does not currently allow access.
 * `code` is a stable machine-readable reason (TRIAL_EXPIRED, SUBSCRIPTION_PAST_DUE, ...).
 */
export class PaymentRequiredError extends AppError {
  constructor(message = 'Payment required', code = 'PAYMENT_REQUIRED') {
    super(message, 402);
    this.code = code;
  }
}

/**
 * 403 with a plan-limit reason. Raised when creating a resource would exceed the plan.
 */
export class PlanLimitError extends AppError {
  constructor(message, { limit, current, resource } = {}) {
    super(message, 403);
    this.code = 'PLAN_LIMIT_REACHED';
    this.errors = [{ field: resource, message, limit, current }];
  }
}

/**
 * Helper to attach a machine-readable code to any AppError subclass instance.
 */
export function withCode(error, code) {
  error.code = code;
  return error;
}
