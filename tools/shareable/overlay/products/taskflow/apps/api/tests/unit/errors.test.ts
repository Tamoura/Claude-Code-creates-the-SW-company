import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../src/lib/errors';

/**
 * The error hierarchy is what every failure response is built from, so its
 * serialisation is worth testing directly rather than only through HTTP.
 * [NFR-001]
 */
describe('AppError', () => {
  it('serialises to problem+json without optional fields [NFR-001]', () => {
    const problem = new AppError(418, 'TEAPOT', 'I am a teapot').toProblem();

    expect(problem).toEqual({
      type: 'https://taskflow.example/problems/teapot',
      title: 'I am a teapot',
      status: 418,
      code: 'TEAPOT',
    });
    expect(problem).not.toHaveProperty('details');
    expect(problem).not.toHaveProperty('instance');
  });

  it('includes details and instance when given [NFR-001]', () => {
    const problem = new AppError(400, 'BAD', 'Bad input', { field: 'title' }).toProblem(
      '/api/v1/tasks'
    );

    expect(problem).toMatchObject({
      details: { field: 'title' },
      instance: '/api/v1/tasks',
    });
  });

  it('keeps the subclass name for logs and stack traces', () => {
    const error = new NotFoundError('Task', 'abc');

    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('NotFoundError');
    expect(error.stack).toContain('NotFoundError');
  });

  it.each([
    ['NotFoundError', new NotFoundError('Task', 'abc'), 404, 'NOT_FOUND'],
    ['BadRequestError', new BadRequestError('nope'), 400, 'BAD_REQUEST'],
    [
      'ValidationError',
      new ValidationError([{ path: 'title', message: 'required' }]),
      422,
      'VALIDATION_FAILED',
    ],
    ['ConflictError', new ConflictError('duplicate'), 409, 'CONFLICT'],
  ])('%s carries its status and code [NFR-001]', (_name, error, status, code) => {
    expect(error.statusCode).toBe(status);
    expect(error.code).toBe(code);
    expect(error.toProblem().status).toBe(status);
  });

  it('names the missing resource in the message', () => {
    expect(new NotFoundError('Project', 'p1').message).toBe('Project p1 was not found');
  });
});
