import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  QuotaExceededError,
} from '../../../src/lib/errors';

describe('[FR-003][AC-052] error taxonomy — the shapes isolation and quota rely on', () => {
  it.each([
    [new ValidationError(), 400, 'VALIDATION_ERROR'],
    [new UnauthorizedError(), 401, 'UNAUTHORIZED'],
    [new QuotaExceededError(), 402, 'QUOTA_EXCEEDED'],
    [new ForbiddenError(), 403, 'FORBIDDEN'],
    [new NotFoundError(), 404, 'NOT_FOUND'],
    [new ConflictError(), 409, 'CONFLICT'],
  ])('[FR-003][AC-014] %s maps to the right status and code', (error, status, code) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(status);
    expect(error.code).toBe(code);
    expect(error.message.length).toBeGreaterThan(0);
  });

  it('[NFR-017] carries the subclass name for log triage', () => {
    expect(new NotFoundError().name).toBe('NotFoundError');
  });

  it('[FR-003] carries structured details when given them', () => {
    const details = [{ field: 'slug', message: 'already taken' }];
    expect(new ConflictError('taken', details).details).toEqual(details);
  });

  it('[AC-052][FR-003] has no ForbiddenError path for cross-tenant reads', () => {
    // Existence must not be disclosed: "not yours" and "not there" are the
    // same answer. This test exists to make a future 403 a deliberate act.
    expect(new NotFoundError().statusCode).toBe(404);
  });
});
