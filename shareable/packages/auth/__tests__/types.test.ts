import { AppError } from '../src/backend/types';

describe('AppError', () => {
  it('creates an error with the correct properties', () => {
    const err = new AppError(404, 'NOT_FOUND', 'Resource not found');

    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
    expect(err.name).toBe('AppError');
  });

  it('is an instance of Error', () => {
    const err = new AppError(500, 'INTERNAL_ERROR', 'Something went wrong');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('toJSON returns RFC 7807 problem details format', () => {
    const err = new AppError(400, 'validation-failed', 'Email is invalid');
    const json = err.toJSON();

    expect(json.type).toBe('https://connectsw.io/errors/validation-failed');
    expect(json.status).toBe(400);
    expect(json.detail).toBe('Email is invalid');
    expect(json.title).toBeDefined();
  });

  it('toJSON capitalizes the title from code', () => {
    const err = new AppError(401, 'unauthorized-access', 'Access denied');
    const json = err.toJSON();
    expect(json.title).toBe('Unauthorized Access');
  });

  it('creates 401 unauthorized error', () => {
    const err = new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    expect(err.statusCode).toBe(401);
  });

  it('creates 403 forbidden error', () => {
    const err = new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
    expect(err.statusCode).toBe(403);
  });

  it('creates 422 validation error', () => {
    const err = new AppError(422, 'VALIDATION_FAILED', 'Email is required');
    expect(err.statusCode).toBe(422);
  });

  it('captures stack trace', () => {
    const err = new AppError(500, 'SERVER_ERROR', 'Unexpected error');
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('AppError');
  });
});
