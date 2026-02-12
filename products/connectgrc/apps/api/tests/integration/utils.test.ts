import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  ValidationError,
} from '../../src/utils/errors';
import { parsePagination, paginatedResult } from '../../src/utils/pagination';
import { redactSensitiveFields } from '../../src/utils/logger';

describe('Error classes', () => {
  it('AppError sets statusCode and code', () => {
    const error = new AppError('test error', 418, 'TEAPOT');
    expect(error.message).toBe('test error');
    expect(error.statusCode).toBe(418);
    expect(error.code).toBe('TEAPOT');
    expect(error).toBeInstanceOf(Error);
  });

  it('NotFoundError defaults to 404', () => {
    const error = new NotFoundError();
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });

  it('UnauthorizedError defaults to 401', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('ForbiddenError defaults to 403', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('BadRequestError defaults to 400', () => {
    const error = new BadRequestError();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
  });

  it('ConflictError defaults to 409', () => {
    const error = new ConflictError();
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });

  it('ValidationError carries field-level errors', () => {
    const error = new ValidationError('Validation failed', {
      email: ['Email is required'],
      name: ['Name too short', 'Name invalid'],
    });
    expect(error.statusCode).toBe(422);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.errors.email).toEqual(['Email is required']);
    expect(error.errors.name).toHaveLength(2);
  });
});

describe('Pagination helper', () => {
  it('parsePagination returns defaults', () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('parsePagination clamps limit to max 100', () => {
    const result = parsePagination({ limit: '500' });
    expect(result.limit).toBe(100);
  });

  it('parsePagination clamps page to min 1', () => {
    const result = parsePagination({ page: '-5' });
    expect(result.page).toBe(1);
  });

  it('paginatedResult wraps data with metadata', () => {
    const data = [{ id: '1' }, { id: '2' }];
    const result = paginatedResult(data, 10, { page: 1, limit: 2 });

    expect(result.data).toEqual(data);
    expect(result.pagination.total).toBe(10);
    expect(result.pagination.totalPages).toBe(5);
    expect(result.pagination.hasMore).toBe(true);
  });

  it('paginatedResult reports hasMore=false on last page', () => {
    const data = [{ id: '1' }];
    const result = paginatedResult(data, 5, { page: 5, limit: 1 });

    expect(result.pagination.hasMore).toBe(false);
  });
});

describe('Logger redaction', () => {
  it('redacts password fields', () => {
    const result = redactSensitiveFields({
      username: 'john',
      password: 'secret123',
    });
    expect(result.username).toBe('john');
    expect(result.password).toBe('[REDACTED]');
  });

  it('redacts nested sensitive fields', () => {
    const result = redactSensitiveFields({
      user: {
        email: 'test@example.com',
        token: 'abc123',
      },
    });
    const user = result.user as Record<string, unknown>;
    expect(user.email).toBe('test@example.com');
    expect(user.token).toBe('[REDACTED]');
  });

  it('redacts authorization headers', () => {
    const result = redactSensitiveFields({
      authorization: 'Bearer xyz',
      method: 'GET',
    });
    expect(result.authorization).toBe('[REDACTED]');
    expect(result.method).toBe('GET');
  });
});
