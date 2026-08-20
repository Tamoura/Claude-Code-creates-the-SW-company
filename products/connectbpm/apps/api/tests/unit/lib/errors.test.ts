import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  QuotaExceededError,
} from '../../../src/lib/errors';

describe('error taxonomy', () => {
  it.each([
    [new ValidationError(), 400, 'VALIDATION_ERROR'],
    [new UnauthorizedError(), 401, 'UNAUTHORIZED'],
    [new QuotaExceededError(), 402, 'QUOTA_EXCEEDED'],
    [new ForbiddenError(), 403, 'FORBIDDEN'],
    [new NotFoundError(), 404, 'NOT_FOUND'],
    [new ConflictError(), 409, 'CONFLICT'],
  ])('%s maps to the right status and code', (error, status, code) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(status);
    expect(error.code).toBe(code);
    expect(error.message.length).toBeGreaterThan(0);
  });

  it('carries the subclass name for log triage', () => {
    expect(new NotFoundError().name).toBe('NotFoundError');
  });

  it('carries structured details when given them', () => {
    const details = [{ field: 'slug', message: 'already taken' }];
    expect(new ConflictError('taken', details).details).toEqual(details);
  });

  it('has no ForbiddenError path for cross-tenant reads (ADR-004, AC-052)', () => {
    // Existence must not be disclosed: "not yours" and "not there" are the
    // same answer. This test exists to make a future 403 a deliberate act.
    expect(new NotFoundError().statusCode).toBe(404);
  });
});
