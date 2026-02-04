import { describe, it, expect } from 'vitest';
import { ApiError } from '../src/errors';

describe('ApiError', () => {
  it('extends Error', () => {
    const err = new ApiError(400, 'VALIDATION_ERROR', 'Invalid input');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('has correct properties', () => {
    const err = new ApiError(404, 'NOT_FOUND', 'Resource not found', { id: '123' });
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
    expect(err.details).toEqual({ id: '123' });
    expect(err.name).toBe('ApiError');
  });

  it('serializes to JSON', () => {
    const err = new ApiError(422, 'INVALID_AMOUNT', 'Amount too low');
    const json = err.toJSON();
    expect(json).toEqual({
      name: 'ApiError',
      statusCode: 422,
      code: 'INVALID_AMOUNT',
      message: 'Amount too low',
      details: undefined,
    });
  });
});
