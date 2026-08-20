/**
 * The error handler is the single place a client-visible error is shaped.
 * These tests pin the contract every route depends on — and the redaction
 * rule, which is a security property, not a cosmetic one.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildApp } from '../../src/app';
import { resetConfigForTests } from '../../src/config';
import {
  ConflictError,
  NotFoundError,
  QuotaExceededError,
} from '../../src/lib/errors';

async function appWithThrowingRoutes(): Promise<FastifyInstance> {
  resetConfigForTests();
  const app = await buildApp({ skipInfrastructure: true });

  app.get('/boom/app-error', async () => {
    throw new ConflictError('slug already taken', [
      { field: 'slug', message: 'taken' },
    ]);
  });
  app.get('/boom/not-found', async () => {
    throw new NotFoundError();
  });
  app.get('/boom/quota', async () => {
    throw new QuotaExceededError();
  });
  app.get('/boom/zod', async () => {
    z.object({ name: z.string() }).parse({ name: 42 });
    return { ok: true };
  });
  app.get('/boom/unexpected', async () => {
    throw new Error('column "secret_hash" violates constraint');
  });

  await app.ready();
  return app;
}

describe('error handler', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await appWithThrowingRoutes();
  });
  afterAll(async () => {
    await app.close();
  });

  it('maps an AppError to its status, code and details', async () => {
    const res = await app.inject({ method: 'GET', url: '/boom/app-error' });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatchObject({
      code: 'CONFLICT',
      message: 'slug already taken',
      details: [{ field: 'slug', message: 'taken' }],
    });
  });

  it('renders a cross-tenant style miss as 404, never 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/boom/not-found' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('maps quota exhaustion to 402 (MET-4)', async () => {
    const res = await app.inject({ method: 'GET', url: '/boom/quota' });
    expect(res.statusCode).toBe(402);
    expect(res.json().error.code).toBe('QUOTA_EXCEEDED');
  });

  it('flattens a ZodError into field-level details', async () => {
    const res = await app.inject({ method: 'GET', url: '/boom/zod' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
    expect(res.json().error.details[0].field).toBe('name');
  });

  it('attaches the correlation id to every error body', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/boom/not-found',
      headers: { 'x-request-id': 'corr-1' },
    });
    expect(res.json().error.requestId).toBe('corr-1');
  });

  it('redacts an unexpected error message in production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await app.inject({ method: 'GET', url: '/boom/unexpected' });
      expect(res.statusCode).toBe(500);
      expect(res.json().error.message).toBe('An unexpected error occurred');
      expect(JSON.stringify(res.json())).not.toContain('secret_hash');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('surfaces the real message outside production', async () => {
    const res = await app.inject({ method: 'GET', url: '/boom/unexpected' });
    expect(res.statusCode).toBe(500);
    expect(res.json().error.message).toContain('secret_hash');
  });

  it('renders an unknown route through the same envelope', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });
});

/**
 * Framework-generated errors. These reach a client through the same handler
 * and must produce the same envelope, or the web client has two error shapes
 * to deal with.
 */
describe('error handler — framework errors', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    resetConfigForTests();
    app = await buildApp({ skipInfrastructure: true });

    app.get('/boom/jwt', async () => {
      const error = new Error('jwt') as Error & { code: string };
      error.code = 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED';
      throw error;
    });
    app.get('/boom/too-large', async () => {
      const error = new Error('too large') as Error & { code: string };
      error.code = 'FST_ERR_CTP_BODY_TOO_LARGE';
      throw error;
    });
    app.get('/boom/rate-limited', async () => {
      const error = new Error('slow down') as Error & { statusCode: number };
      error.statusCode = 429;
      throw error;
    });
    app.post(
      '/boom/schema',
      {
        schema: {
          body: {
            type: 'object',
            required: ['name'],
            properties: { name: { type: 'string' } },
          },
        },
      },
      async () => ({ ok: true })
    );

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('maps any FST_JWT_* code to 401 without echoing the token error', async () => {
    const res = await app.inject({ method: 'GET', url: '/boom/jwt' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  });

  it('maps an oversized body to 413', async () => {
    const res = await app.inject({ method: 'GET', url: '/boom/too-large' });
    expect(res.statusCode).toBe(413);
    expect(res.json().error.code).toBe('BODY_TOO_LARGE');
  });

  it('maps a 429 into the standard envelope', async () => {
    const res = await app.inject({ method: 'GET', url: '/boom/rate-limited' });
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('RATE_LIMITED');
  });

  it('flattens a Fastify schema failure to 422 with the field name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/boom/schema',
      payload: {},
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
    expect(res.json().error.details[0].field).toBe('name');
  });
});
