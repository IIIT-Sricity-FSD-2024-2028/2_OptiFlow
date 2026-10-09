import { ValidationError } from './errors.js';

/**
 * Validates that required fields are present and non-empty in the object
 */
export function validateRequired(data = {}, fields = []) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ValidationError('Validation failed: payload must be an object', [
      { field: 'body', message: 'Request body must be a valid JSON object' },
    ]);
  }

  const errors = [];
  for (const field of fields) {
    const val = data[field];
    if (
      val === undefined ||
      val === null ||
      (typeof val === 'string' && val.trim() === '')
    ) {
      errors.push({ field, message: `${field} is required` });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Missing required fields', errors);
  }
}

/**
 * Validates email format using standard regex
 */
export function validateEmail(email, fieldName = 'email') {
  if (typeof email !== 'string' || email.trim() === '') {
    throw new ValidationError('Invalid email format', [
      { field: fieldName, message: `${fieldName} must be a non-empty string` },
    ]);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new ValidationError('Invalid email format', [
      { field: fieldName, message: `${fieldName} is not a valid email address` },
    ]);
  }
}

/**
 * Validates that a value belongs to an allowed set or enum object
 */
export function validateEnum(value, allowedValues, fieldName = 'field') {
  if (value === undefined || value === null) return;

  const validList = Array.isArray(allowedValues)
    ? allowedValues
    : Object.values(allowedValues);

  if (!validList.includes(value)) {
    throw new ValidationError(`Invalid value for ${fieldName}`, [
      {
        field: fieldName,
        message: `${fieldName} must be one of: ${validList.join(', ')}`,
      },
    ]);
  }
}

/**
 * Validates that a value is a valid numeric value with optional bounds and integer checks.
 * Explicitly guards against JS coercion traps (e.g. booleans, empty strings, arrays).
 */
export function validateNumber(value, fieldName = 'field', { min, max, integer = false } = {}) {
  if (value === undefined || value === null) return;

  if (
    typeof value === 'boolean' ||
    Array.isArray(value) ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    throw new ValidationError(`Invalid number for ${fieldName}`, [
      { field: fieldName, message: `${fieldName} must be a valid numeric value` },
    ]);
  }

  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new ValidationError(`Invalid number for ${fieldName}`, [
      { field: fieldName, message: `${fieldName} must be a finite numeric value` },
    ]);
  }

  if (integer && !Number.isInteger(num)) {
    throw new ValidationError(`Invalid integer for ${fieldName}`, [
      { field: fieldName, message: `${fieldName} must be an integer` },
    ]);
  }

  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} below minimum`, [
      { field: fieldName, message: `${fieldName} must be at least ${min}` },
    ]);
  }

  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} above maximum`, [
      { field: fieldName, message: `${fieldName} must be at most ${max}` },
    ]);
  }
}

