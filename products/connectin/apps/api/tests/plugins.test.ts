import Fastify, { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import metricsPlugin from '../src/plugins/metrics';
import accessLogPlugin from '../src/plugins/access-log';
import rateLimiterPlugin from '../src/plugins/rate-limiter';
import redisPlugin from '../src/plugins/redis';
import requestIdPlugin from '../src/plugins/request-id';
import errorHandlerPlugin from '../src/plugins/error-handler';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from '../src/lib/errors';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Build a minimal Fastify app with only the given plugins registered. */
async function buildIsolated(
  register: (app: FastifyInstance) => Promise<void>
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await register(app);
  await app.ready();
  return app;
}

// ---------------------------------------------------------------------------
// metrics.ts
// ---------------------------------------------------------------------------

describe('metrics plugin', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildIsolated(async (a) => {
      await a.register(metricsPlugin);
      // Dummy route so we can generate request traffic
      a.get('/ping', async () => ({ ok: true }));
    });
  });

  afterAll(() => app.close());

  it('exposes GET /metrics endpoint', async () => {
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
  });

  it('returns Prometheus text format (Content-Type)', async () => {
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.headers['content-type']).toMatch(/text\/plain/);
  });

  it('includes http_requests_total counter in output', async () => {
    // Make a request so the counter is non-zero
    await app.inject({ method: 'GET', url: '/ping' });

    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.payload).toContain('http_requests_total');
  });

  it('includes http_request_duration_seconds histogram in output', async () => {
    await app.inject({ method: 'GET', url: '/ping' });

    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.payload).toContain('http_request_duration_seconds');
  });

  it('increments http_requests_total counter on each request', async () => {
    // First snapshot
    const before = await app.inject({ method: 'GET', url: '/metrics' });
    const matchBefore = before.payload.match(
      /http_requests_total\{[^}]*\} (\d+(?:\.\d+)?)/g
    );
    const totalBefore = matchBefore
      ? matchBefore.reduce(
          (sum, m) => sum + parseFloat(m.split(' ')[1]),
          0
        )
      : 0;

    // Generate traffic
    await app.inject({ method: 'GET', url: '/ping' });
    await app.inject({ method: 'GET', url: '/ping' });

    // Second snapshot
    const after = await app.inject({ method: 'GET', url: '/metrics' });
    const matchAfter = after.payload.match(
      /http_requests_total\{[^}]*\} (\d+(?:\.\d+)?)/g
    );
    const totalAfter = matchAfter
      ? matchAfter.reduce(
          (sum, m) => sum + parseFloat(m.split(' ')[1]),
          0
        )
      : 0;

    expect(totalAfter).toBeGreaterThan(totalBefore);
  });
});

// ---------------------------------------------------------------------------
// access-log.ts
// ---------------------------------------------------------------------------

describe('access-log plugin', () => {
  let app: FastifyInstance;
  let logInfoSpy: jest.SpyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: true });
    await app.register(accessLogPlugin);
    app.get('/hello', async () => ({ hello: 'world' }));
    await app.ready();
    logInfoSpy = jest.spyOn(app.log, 'info');
  });

  afterAll(() => app.close());

  it('logs a message on each request', async () => {
    logInfoSpy.mockClear();
    await app.inject({ method: 'GET', url: '/hello' });
    expect(logInfoSpy).toHaveBeenCalled();
  });

  it('log entry contains method', async () => {
    logInfoSpy.mockClear();
    await app.inject({ method: 'GET', url: '/hello' });
    const call = logInfoSpy.mock.calls[0][0];
    expect(call.method).toBe('GET');
  });

  it('log entry contains url', async () => {
    logInfoSpy.mockClear();
    await app.inject({ method: 'GET', url: '/hello' });
    const call = logInfoSpy.mock.calls[0][0];
    expect(call.url).toBe('/hello');
  });

  it('log entry contains statusCode', async () => {
    logInfoSpy.mockClear();
    await app.inject({ method: 'GET', url: '/hello' });
    const call = logInfoSpy.mock.calls[0][0];
    expect(call.statusCode).toBe(200);
  });

  it('log entry contains numeric duration', async () => {
    logInfoSpy.mockClear();
    await app.inject({ method: 'GET', url: '/hello' });
    const call = logInfoSpy.mock.calls[0][0];
    expect(typeof call.duration).toBe('number');
  });

  it('log entry contains requestId', async () => {
    logInfoSpy.mockClear();
    await app.inject({ method: 'GET', url: '/hello' });
    const call = logInfoSpy.mock.calls[0][0];
    expect(call.requestId).toBeDefined();
  });

  it('hashes the IP in production mode', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    logInfoSpy.mockClear();
    await app.inject({ method: 'GET', url: '/hello' });
    const call = logInfoSpy.mock.calls[0][0];
    // The hashed IP should be a 16-char hex string, not '127.0.0.1'
    expect(call.ip).not.toBe('127.0.0.1');
    expect(typeof call.ip).toBe('string');
    expect(call.ip.length).toBe(16);
    process.env.NODE_ENV = prev;
  });

  it('exposes raw IP in non-production mode', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    logInfoSpy.mockClear();
    await app.inject({ method: 'GET', url: '/hello' });
    const call = logInfoSpy.mock.calls[0][0];
    // In inject(), the ip is '127.0.0.1'
    expect(call.ip).toBe('127.0.0.1');
    process.env.NODE_ENV = prev;
  });
});

// ---------------------------------------------------------------------------
// rate-limiter.ts
//
// @fastify/rate-limit v9 throws the errorResponseBuilder result as a plain
// object (not an Error) which reaches Fastify's setErrorHandler.
// The error-handler plugin detects this shape and sends it as 429.
// Both plugins must be present for correct behaviour — we test them together.
// ---------------------------------------------------------------------------

describe('rate-limiter plugin', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Use max:3 so we can trigger the limit with a handful of requests.
    app = await buildIsolated(async (a) => {
      // error-handler must come first — it processes rate-limit errors into 429
      await a.register(errorHandlerPlugin);
      await a.register(rateLimit, {
        max: 3,
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
          },
        }),
      });
      a.get('/limited', async () => ({ ok: true }));
    });
  });

  afterAll(() => app.close());

  it('allows requests below the rate limit', async () => {
    const res = await app.inject({ method: 'GET', url: '/limited' });
    expect(res.statusCode).toBe(200);
  });

  it('returns 429 when the rate limit is exceeded', async () => {
    // max is 3 and 1 request already used in previous test
    await app.inject({ method: 'GET', url: '/limited' });
    await app.inject({ method: 'GET', url: '/limited' });
    // 4th request exceeds the limit
    const res = await app.inject({ method: 'GET', url: '/limited' });
    expect(res.statusCode).toBe(429);
  });

  it('rate-limited response body has code RATE_LIMITED', async () => {
    // Already over limit from previous tests
    const res = await app.inject({ method: 'GET', url: '/limited' });
    expect(res.statusCode).toBe(429);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('rateLimiterPlugin registers without error (smoke test)', async () => {
    // Verify the production wrapper plugin can be registered on a fresh app
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const smokeApp = await buildIsolated(async (a) => {
      await a.register(rateLimiterPlugin);
      a.get('/smoke', async () => ({ ok: true }));
    });

    const res = await smokeApp.inject({ method: 'GET', url: '/smoke' });
    expect(res.statusCode).toBe(200);

    await smokeApp.close();
    process.env.NODE_ENV = prev;
  });
});

// ---------------------------------------------------------------------------
// redis.ts — dual-mode (RISK-002)
// ---------------------------------------------------------------------------

describe('redis plugin (in-memory fallback)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // No REDIS_URL → falls back to in-memory
    delete process.env.REDIS_URL;
    app = await buildIsolated(async (a) => {
      await a.register(redisPlugin);
    });
  });

  afterAll(() => app.close());

  it('decorates fastify with a redis object', () => {
    expect(app.redis).toBeDefined();
  });

  it('get() returns null for a key that does not exist', async () => {
    const val = await app.redis.get('nonexistent-key');
    expect(val).toBeNull();
  });

  it('set() then get() returns stored value', async () => {
    await app.redis.set('mykey', '1');
    const val = await app.redis.get('mykey');
    expect(val).toBe('1');
  });

  it('set() overwrites existing key', async () => {
    await app.redis.set('overwrite-key', 'first');
    await app.redis.set('overwrite-key', 'second');
    const val = await app.redis.get('overwrite-key');
    expect(val).toBe('second');
  });

  it('get() returns null for an expired key', async () => {
    await app.redis.set('expiring', '1', { EX: 1 });
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const val = await app.redis.get('expiring');
    expect(val).toBeNull();
  }, 5000);

  it('uses default TTL when EX is not specified', async () => {
    await app.redis.set('default-ttl', '1');
    // Should still exist immediately
    const val = await app.redis.get('default-ttl');
    expect(val).toBe('1');
  });
});

describe('redis plugin (production validation)', () => {
  it('throws if NODE_ENV=production and no REDIS_URL', async () => {
    const prev = process.env.NODE_ENV;
    const prevRedis = process.env.REDIS_URL;
    process.env.NODE_ENV = 'production';
    delete process.env.REDIS_URL;

    await expect(
      buildIsolated(async (a) => {
        await a.register(redisPlugin);
      })
    ).rejects.toThrow(/REDIS_URL/);

    process.env.NODE_ENV = prev;
    if (prevRedis) process.env.REDIS_URL = prevRedis;
  });
});

// ---------------------------------------------------------------------------
// request-id.ts (RISK-006)
// ---------------------------------------------------------------------------

describe('request-id plugin', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildIsolated(async (a) => {
      await a.register(requestIdPlugin);
      a.get('/echo', async (req) => ({
        requestId: req.id,
      }));
    });
  });

  afterAll(() => app.close());

  it('assigns a UUID when no x-request-id header is sent', async () => {
    const res = await app.inject({ method: 'GET', url: '/echo' });
    const header = res.headers['x-request-id'] as string;
    expect(header).toBeDefined();
    expect(header).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('echoes a valid UUID x-request-id header', async () => {
    const validId = '12345678-1234-1234-1234-123456789abc';
    const res = await app.inject({
      method: 'GET',
      url: '/echo',
      headers: { 'x-request-id': validId },
    });
    expect(res.headers['x-request-id']).toBe(validId);
  });

  it('rejects invalid x-request-id with a new UUID', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/echo',
      headers: { 'x-request-id': 'not-a-uuid' },
    });
    const header = res.headers['x-request-id'] as string;
    expect(header).not.toBe('not-a-uuid');
    expect(header).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('rejects oversized x-request-id header', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/echo',
      headers: { 'x-request-id': 'a'.repeat(100) },
    });
    const header = res.headers['x-request-id'] as string;
    expect(header).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});

// ---------------------------------------------------------------------------
// access-log.ts — additional coverage (RISK-006)
// ---------------------------------------------------------------------------

describe('access-log plugin — userId logging', () => {
  let app: FastifyInstance;
  let logInfoSpy: jest.SpyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: true });
    await app.register(accessLogPlugin);
    // Simulate an authenticated route by setting request.user
    app.addHook('onRequest', async (request) => {
      (request as any).user = { sub: 'user-123' };
    });
    app.get('/authed', async () => ({ ok: true }));
    await app.ready();
    logInfoSpy = jest.spyOn(app.log, 'info');
  });

  afterAll(() => app.close());

  it('log contains userId when user is authenticated', async () => {
    logInfoSpy.mockClear();
    await app.inject({ method: 'GET', url: '/authed' });
    const call = logInfoSpy.mock.calls[0][0];
    expect(call.userId).toBe('user-123');
  });

  it('log contains "anonymous" when user is not set', async () => {
    // Build a separate app without the user hook
    const anonApp = Fastify({ logger: true });
    await anonApp.register(accessLogPlugin);
    anonApp.get('/anon', async () => ({ ok: true }));
    await anonApp.ready();

    const spy = jest.spyOn(anonApp.log, 'info');
    await anonApp.inject({ method: 'GET', url: '/anon' });
    const call = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(call.userId).toBe('anonymous');

    await anonApp.close();
  });
});

// ---------------------------------------------------------------------------
// error-handler.ts
// ---------------------------------------------------------------------------

describe('error-handler plugin', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildIsolated(async (a) => {
      await a.register(errorHandlerPlugin);

      a.get('/validation-error', async () => {
        throw new ValidationError('Bad input', [
          { field: 'email', message: 'Invalid email' },
        ]);
      });

      a.get('/not-found', async () => {
        throw new NotFoundError('Thing not found');
      });

      a.get('/unauthorized', async () => {
        throw new UnauthorizedError('Not logged in');
      });

      a.get('/forbidden', async () => {
        throw new ForbiddenError('No access');
      });

      a.get('/generic-error', async () => {
        throw new Error('Something exploded');
      });
    });
  });

  afterAll(() => app.close());

  it('ValidationError returns 422', async () => {
    const res = await app.inject({ method: 'GET', url: '/validation-error' });
    expect(res.statusCode).toBe(422);
  });

  it('ValidationError response has VALIDATION_ERROR code', async () => {
    const res = await app.inject({ method: 'GET', url: '/validation-error' });
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('ValidationError response includes error.details array', async () => {
    const res = await app.inject({ method: 'GET', url: '/validation-error' });
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.error.details)).toBe(true);
    expect(body.error.details.length).toBeGreaterThan(0);
  });

  it('NotFoundError returns 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/not-found' });
    expect(res.statusCode).toBe(404);
  });

  it('NotFoundError response has NOT_FOUND code', async () => {
    const res = await app.inject({ method: 'GET', url: '/not-found' });
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('UnauthorizedError returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/unauthorized' });
    expect(res.statusCode).toBe(401);
  });

  it('UnauthorizedError response has UNAUTHORIZED code', async () => {
    const res = await app.inject({ method: 'GET', url: '/unauthorized' });
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('ForbiddenError returns 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/forbidden' });
    expect(res.statusCode).toBe(403);
  });

  it('ForbiddenError response has FORBIDDEN code', async () => {
    const res = await app.inject({ method: 'GET', url: '/forbidden' });
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('Generic Error returns 500', async () => {
    const res = await app.inject({ method: 'GET', url: '/generic-error' });
    expect(res.statusCode).toBe(500);
  });

  it('Generic Error in production does not expose original error message', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const prodApp = await buildIsolated(async (a) => {
      await a.register(errorHandlerPlugin);
      a.get('/boom', async () => {
        throw new Error('internal details');
      });
    });

    const res = await prodApp.inject({ method: 'GET', url: '/boom' });
    const body = JSON.parse(res.body);

    expect(body.error.message).not.toContain('internal details');
    expect(body.error.message).toContain('unexpected error');

    await prodApp.close();
    process.env.NODE_ENV = prev;
  });

  it('Generic Error in development exposes the error message', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const devApp = await buildIsolated(async (a) => {
      await a.register(errorHandlerPlugin);
      a.get('/boom', async () => {
        throw new Error('sensitive detail exposed in dev');
      });
    });

    const res = await devApp.inject({ method: 'GET', url: '/boom' });
    const body = JSON.parse(res.body);

    expect(body.error.message).toContain('sensitive detail exposed in dev');

    await devApp.close();
    process.env.NODE_ENV = prev;
  });

  it('error response includes requestId for traceability', async () => {
    const traceApp = await buildIsolated(async (a) => {
      await a.register(requestIdPlugin);
      await a.register(errorHandlerPlugin);
      a.get('/trace-error', async () => {
        throw new NotFoundError('Missing resource');
      });
    });

    const res = await traceApp.inject({ method: 'GET', url: '/trace-error' });
    const body = JSON.parse(res.body);
    expect(body.error.requestId).toBeDefined();
    expect(body.error.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    await traceApp.close();
  });
});

// ---------------------------------------------------------------------------
// metrics.ts — security counters
// ---------------------------------------------------------------------------

describe('metrics plugin — security counters', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildIsolated(async (a) => {
      await a.register(metricsPlugin);
      // Simulate auth routes
      a.post('/api/v1/auth/login', async (_req, reply) => {
        reply.status(200).send({ ok: true });
      });
      a.post('/api/v1/auth/register', async (_req, reply) => {
        reply.status(201).send({ ok: true });
      });
    });
  });

  afterAll(() => app.close());

  it('includes auth_events_total counter in metrics output', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/auth/login' });

    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.payload).toContain('auth_events_total');
  });

  it('includes auth_failures_total counter in metrics output', async () => {
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.payload).toContain('auth_failures_total');
  });
});
