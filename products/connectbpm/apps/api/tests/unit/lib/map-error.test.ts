/**
 * The error mapping is pure, so it is tested directly — no app, no port, no
 * database. Downstream agents: follow this shape. A branch that needs a whole
 * Fastify instance to reach is a branch in the wrong place.
 */
import { ZodError, z } from 'zod';
import { mapError } from '../../../src/lib/map-error';
import { ConflictError, NotFoundError } from '../../../src/lib/errors';

const CTX = { requestId: 'req-1', isProduction: false };

describe('[FR-003][AC-052] mapError — one envelope, and no disclosure in it', () => {
  it('[FR-003] passes an AppError through with its details', () => {
    const payload = mapError(
      new ConflictError('taken', [{ field: 'slug', message: 'taken' }]),
      CTX
    );
    expect(payload).toEqual({
      status: 409,
      code: 'CONFLICT',
      message: 'taken',
      details: [{ field: 'slug', message: 'taken' }],
      requestId: 'req-1',
    });
  });

  it('[AC-052][FR-003] renders a missing resource as 404, the same as a cross-tenant miss', () => {
    expect(mapError(new NotFoundError(), CTX).status).toBe(404);
  });

  it('[FR-003] flattens a ZodError to field-level details', () => {
    let zodError: ZodError | undefined;
    try {
      z.object({ name: z.string() }).parse({ name: 1 });
    } catch (error) {
      zodError = error as ZodError;
    }
    const payload = mapError(zodError, CTX);
    expect(payload.status).toBe(400);
    expect(payload.details?.[0]?.field).toBe('name');
  });

  it('[FR-003] flattens a Fastify schema failure to 422', () => {
    const payload = mapError(
      { validation: [{ params: { missingProperty: 'name' } }] },
      CTX
    );
    expect(payload.status).toBe(422);
    expect(payload.details).toEqual([{ field: 'name', message: 'Invalid value' }]);
  });

  it('[FR-003] defaults an unnamed validation field rather than crashing', () => {
    const payload = mapError({ validation: [{ message: 'bad' }] }, CTX);
    expect(payload.details).toEqual([{ field: 'unknown', message: 'bad' }]);
  });

  it('[NFR-008] translates any FST_JWT_* code to 401 without echoing the token error', () => {
    expect(mapError({ code: 'FST_JWT_BAD_COOKIE_REQUEST' }, CTX).status).toBe(401);
    expect(mapError({ code: 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' }, CTX).code).toBe(
      'UNAUTHORIZED'
    );
  });

  it('[NFR-008] translates an oversized body to 413', () => {
    expect(mapError({ code: 'FST_ERR_CTP_BODY_TOO_LARGE' }, CTX).status).toBe(413);
  });

  it('[NFR-008] translates a 429 to RATE_LIMITED', () => {
    expect(mapError({ statusCode: 429 }, CTX).code).toBe('RATE_LIMITED');
  });

  it('[FR-003] leaves an unrecognised framework code to the fallback', () => {
    expect(mapError({ code: 'FST_ERR_SOMETHING_ELSE' }, CTX).status).toBe(500);
  });

  it('[AC-052][NFR-008] redacts an unexpected message in production — Prisma errors name columns and values', () => {
    const payload = mapError(
      new Error('column "secret_hash" violates unique constraint'),
      { requestId: 'req-1', isProduction: true }
    );
    expect(payload.message).toBe('An unexpected error occurred');
    expect(payload.message).not.toContain('secret_hash');
  });

  it('[NFR-008] surfaces the real message outside production', () => {
    expect(mapError(new Error('boom'), CTX).message).toBe('boom');
  });

  it('[FR-003] stringifies a thrown non-Error', () => {
    expect(mapError('just a string', CTX).message).toBe('just a string');
  });
});
