export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code = 'INTERNAL_ERROR', statusCode = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    super(
      identifier ? `${resource} with identifier "${identifier}" was not found.` : `${resource} was not found.`,
      'NOT_FOUND',
      404,
      { resource, identifier }
    );
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required to access this resource.') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have required permissions to perform this action.') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 422, { fields });
    this.name = 'ValidationError';
  }
}

export class TenantIsolationError extends AppError {
  constructor(tenantId: string, resource: string) {
    super(
      `Cross-tenant access violation: resource "${resource}" does not belong to organization tenant "${tenantId}".`,
      'TENANT_ISOLATION_VIOLATION',
      403,
      { tenantId, resource }
    );
    this.name = 'TenantIsolationError';
  }
}

export class NetworkOfflineError extends AppError {
  constructor(message = 'You are currently offline. This action will be retried when connectivity is restored.') {
    super(message, 'NETWORK_OFFLINE', 503);
    this.name = 'NetworkOfflineError';
  }
}
