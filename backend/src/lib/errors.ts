// src/lib/errors.ts
// Typed application error classes — never leak internals to clients

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly fields?: Record<string, string>;

  constructor(
    code: string,
    statusCode: number,
    message?: string,
    fields?: Record<string, string>,
  ) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.fields = fields;
  }
}

// Convenience factories
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', 404, `${resource} not found`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Not found') {
    // 404 not 403 — prevent resource enumeration
    super('FORBIDDEN', 404, message);
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>) {
    super('VALIDATION_ERROR', 422, 'Validation failed', fields);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super('CONFLICT', 409, message);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor() {
    super('INSUFFICIENT_BALANCE', 422, 'Insufficient wallet balance');
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super('RATE_LIMIT_EXCEEDED', 429, 'Too many requests');
  }
}

export class IdempotencyConflictError extends AppError {
  constructor() {
    super(
      'IDEMPOTENCY_CONFLICT',
      422,
      'Idempotency key reused with different payload',
    );
  }
}
