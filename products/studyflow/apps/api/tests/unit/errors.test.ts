import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../../src/lib/errors';

describe('AppError hierarchy — RFC 7807 mapping', () => {
  it('toProblem() maps code → kebab type URI, with status/title/detail', () => {
    const p = new AppError('boom', 418, 'TEAPOT_ERROR').toProblem();
    expect(p).toMatchObject({
      type: 'https://studyflow.app/errors/teapot-error',
      title: 'AppError',
      status: 418,
      detail: 'boom',
    });
    // No instance and no extensions were provided → keys absent.
    expect(p.instance).toBeUndefined();
  });

  it('toProblem(instance) includes the instance member', () => {
    const p = new AppError('x', 400, 'X').toProblem('/v1/things/1');
    expect(p.instance).toBe('/v1/things/1');
  });

  it('withExtensions() merges extension members into the body (C-7 dependentGoals)', () => {
    const p = new ConflictError('has goals')
      .withExtensions({ dependentGoals: [{ id: 'g1', title: 'Read' }] })
      .toProblem('/v1/selections/1');
    expect(p.status).toBe(409);
    expect(p.dependentGoals).toEqual([{ id: 'g1', title: 'Read' }]);
    expect(p.instance).toBe('/v1/selections/1');
  });

  it('withExtensions() is fluent and accumulates', () => {
    const e = new AppError('m', 400, 'C').withExtensions({ a: 1 }).withExtensions({ b: 2 });
    expect(e.toProblem()).toMatchObject({ a: 1, b: 2 });
  });

  describe('subclasses carry the right status, code and default messages', () => {
    it('ValidationError defaults + omits empty errors map', () => {
      const p = new ValidationError().toProblem();
      expect(p).toMatchObject({ status: 400, title: 'ValidationError', detail: 'Validation failed' });
      expect(p.errors).toBeUndefined();
    });

    it('ValidationError includes a non-empty errors map', () => {
      const p = new ValidationError('bad', { email: ['required'] }).toProblem();
      expect(p.errors).toEqual({ email: ['required'] });
    });

    it.each([
      [new UnauthorizedError(), 401, 'UnauthorizedError', 'Unauthorized'],
      [new ForbiddenError(), 403, 'ForbiddenError', 'Forbidden'],
      [new NotFoundError(), 404, 'NotFoundError', 'Resource not found'],
      [new ConflictError(), 409, 'ConflictError', 'Conflict'],
    ])('%s uses default message', (err, status, title, detail) => {
      const e = err as AppError;
      const p = e.toProblem();
      expect(p.status).toBe(status);
      expect(p.title).toBe(title);
      expect(p.detail).toBe(detail);
    });

    it.each([
      [new UnauthorizedError('no token'), 'no token'],
      [new ForbiddenError('not yours'), 'not yours'],
      [new NotFoundError('gone'), 'gone'],
      [new ConflictError('dupe'), 'dupe'],
    ])('%s accepts a custom message', (err, detail) => {
      expect((err as AppError).toProblem().detail).toBe(detail);
    });
  });
});
