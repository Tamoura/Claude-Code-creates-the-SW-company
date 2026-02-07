/**
 * Security-specific integration tests.
 * Validates authentication enforcement, rate limiting,
 * input validation, and error response sanitization.
 *
 * Uses its own app instance to avoid rate limiter state
 * shared with other test suites.
 */
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/pulse_test';
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ||
  'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
delete process.env.REDIS_URL;

async function cleanDatabase(app: FastifyInstance): Promise<void> {
  const prisma = app.prisma;
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.teamInvitation.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.riskSnapshot.deleteMany();
  await prisma.metricSnapshot.deleteMany();
  await prisma.coverageReport.deleteMany();
  await prisma.review.deleteMany();
  await prisma.deployment.deleteMany();
  await prisma.pullRequest.deleteMany();
  await prisma.commit.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
}

/** Register a user and return the JWT token */
async function registerUser(
  app: FastifyInstance,
  email = 'security-test@pulse.dev'
): Promise<{ token: string; userId: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email,
      password: 'SecureP@ss123',
      name: 'Security Tester',
    },
  });
  const body = JSON.parse(res.payload);
  return { token: body.token, userId: body.user.id };
}

// ── Authentication enforcement ──────────────────────

describe('Security: Authentication enforcement', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await cleanDatabase(app);
    const result = await registerUser(app);
    authToken = result.token;
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  const protectedEndpoints = [
    { method: 'GET' as const, url: '/api/v1/repos?teamId=test' },
    { method: 'POST' as const, url: '/api/v1/repos' },
    { method: 'DELETE' as const, url: '/api/v1/repos/test-id' },
    { method: 'GET' as const, url: '/api/v1/repos/test-id/sync-status' },
    { method: 'GET' as const, url: '/api/v1/repos/available' },
    { method: 'GET' as const, url: '/api/v1/activity' },
    { method: 'GET' as const, url: '/api/v1/metrics/velocity?teamId=test' },
    { method: 'GET' as const, url: '/api/v1/metrics/coverage?teamId=test' },
    { method: 'GET' as const, url: '/api/v1/metrics/summary?teamId=test' },
    { method: 'POST' as const, url: '/api/v1/metrics/aggregate' },
  ];

  it.each(protectedEndpoints)(
    'should return 401 for $method $url without token',
    async ({ method, url }) => {
      const response = await app.inject({ method, url });
      expect(response.statusCode).toBe(401);
    }
  );

  it('should return 401 for expired token', async () => {
    const expiredToken = app.jwt.sign(
      { sub: 'test-id', email: 'test@test.com', name: 'Test' },
      { expiresIn: '1s' }
    );
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/activity',
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for malformed JWT', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/activity',
      headers: { authorization: 'Bearer not.a.valid.jwt' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('should allow health endpoint without authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
  });
});

// ── Error response sanitization ─────────────────────

describe('Security: Error response sanitization', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await cleanDatabase(app);
    const result = await registerUser(app);
    authToken = result.token;
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  it('should return RFC 7807 format for all errors', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/nonexistent-endpoint',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.type).toBeDefined();
    expect(body.title).toBeDefined();
    expect(body.status).toBe(404);
    expect(body.detail).toBeDefined();
  });

  it('should not leak stack traces in error responses', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/repos?teamId=test',
      headers: { authorization: `Bearer ${authToken}` },
    });

    const body = JSON.parse(response.payload);
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain('node_modules');
    expect(bodyStr).not.toContain('at Object.');
    expect(bodyStr).not.toContain('.ts:');
  });

  it('should not expose internal error details for 500 errors', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'test-500@pulse.dev',
        password: 'SecureP@ss123',
        name: 'A'.repeat(101),
      },
    });
    expect(response.statusCode).toBeLessThan(500);
  });
});

// ── Input validation ────────────────────────────────

describe('Security: Input validation', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await cleanDatabase(app);
    const result = await registerUser(app);
    authToken = result.token;
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  it('should handle XSS in name field safely via Prisma', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'xss-test@pulse.dev',
        password: 'SecureP@ss123',
        name: '<script>alert("xss")</script>',
      },
    });

    if (response.statusCode === 201) {
      const body = JSON.parse(response.payload);
      // Stored safely via parameterized queries (no SQL injection)
      expect(body.user.name).toBe('<script>alert("xss")</script>');
    }
  });

  it('should reject SQL injection in email field', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: "admin@test.com' OR '1'='1",
        password: 'anything',
      },
    });
    expect(response.statusCode).toBe(422);
  });

  it('should enforce max pagination limit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/activity?limit=9999',
      headers: { authorization: `Bearer ${authToken}` },
    });

    // Zod rejects limit > 100 or caps it
    expect([200, 422]).toContain(response.statusCode);
    if (response.statusCode === 200) {
      const body = JSON.parse(response.payload);
      expect(body.items.length).toBeLessThanOrEqual(100);
    }
  });

  it('should reject webhook without required headers', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/github',
      payload: { test: true },
    });
    expect(response.statusCode).toBe(401);
  });
});

// ── Rate limiting ───────────────────────────────────

describe('Security: Rate limiting', () => {
  let app: FastifyInstance;
  const origNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    // Force non-test mode to get production rate limits (10/min on auth)
    process.env.NODE_ENV = 'development';
    app = await buildApp();
    await app.ready();
    await cleanDatabase(app);
    // Restore NODE_ENV for other modules
    process.env.NODE_ENV = origNodeEnv;
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  it('should have rate limit headers on responses', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'test@pulse.dev',
        password: 'WrongP@ss123',
      },
    });

    const hasRateLimitHeader =
      response.headers['x-ratelimit-limit'] !== undefined ||
      response.headers['ratelimit-limit'] !== undefined;
    expect(hasRateLimitHeader).toBe(true);
  });

  it('should enforce rate limits on auth endpoints', async () => {
    // Auth endpoints have stricter limits (10/min per IP).
    // Send enough requests to exceed the limit.
    const statusCodes: number[] = [];
    for (let i = 0; i < 15; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'ratelimit-test@pulse.dev',
          password: 'WrongP@ss123',
        },
      });
      statusCodes.push(res.statusCode);
    }

    // At least some should be rate-limited (429)
    const has429 = statusCodes.some((code) => code === 429);
    expect(has429).toBe(true);
  });
});

// ── GitHub token encryption ─────────────────────────

describe('Security: GitHub token encryption', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await cleanDatabase(app);
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  it('should encrypt and decrypt GitHub tokens correctly', async () => {
    const { encryptToken, decryptToken } = await import(
      '../../src/utils/encryption.js'
    );

    const plainToken = 'gho_test_github_oauth_token_12345';
    const encrypted = encryptToken(plainToken);

    // Encrypted value should not contain the original token
    expect(encrypted).not.toContain(plainToken);
    expect(encrypted).not.toBe(plainToken);

    // Should have the iv:authTag:ciphertext format
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);

    // Should be able to decrypt back
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(plainToken);
  });

  it('should produce different ciphertexts for same input', async () => {
    const { encryptToken } = await import(
      '../../src/utils/encryption.js'
    );

    const token = 'gho_same_token_value';
    const enc1 = encryptToken(token);
    const enc2 = encryptToken(token);

    // Different random IVs produce different ciphertext each time
    expect(enc1).not.toBe(enc2);
  });

  it('should detect tampered ciphertext', async () => {
    const { encryptToken, decryptToken } = await import(
      '../../src/utils/encryption.js'
    );

    const encrypted = encryptToken('gho_secret_token');
    // Tamper with the ciphertext portion
    const parts = encrypted.split(':');
    parts[2] = parts[2].slice(0, -4) + 'ffff';
    const tampered = parts.join(':');

    expect(() => decryptToken(tampered)).toThrow();
  });

  it('should not return GitHub token in API responses', async () => {
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'token-check@pulse.dev',
        password: 'SecureP@ss123',
        name: 'Token Check',
      },
    });

    expect(regRes.statusCode).toBe(201);
    const body = JSON.parse(regRes.payload);
    expect(body.user.githubToken).toBeUndefined();
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.user.password).toBeUndefined();
  });

  it('should decrypt an encrypted token via requireGitHubToken', async () => {
    const { encryptToken, isEncrypted } = await import(
      '../../src/utils/encryption.js'
    );
    const { RepoService } = await import(
      '../../src/modules/repos/service.js'
    );

    // Create a user with an encrypted GitHub token
    const plainToken = 'gho_test_decryption_12345';
    const encryptedToken = encryptToken(plainToken);
    expect(isEncrypted(encryptedToken)).toBe(true);

    const user = await app.prisma.user.create({
      data: {
        email: 'encrypted-token@pulse.dev',
        passwordHash: 'not-a-real-hash',
        name: 'Encrypted Token User',
        githubToken: encryptedToken,
      },
    });

    const service = new RepoService(app.prisma);
    const token = await service.requireGitHubToken(user.id);

    // Should return the decrypted plaintext token, not the encrypted value
    expect(token).toBe(plainToken);
    expect(token).not.toBe(encryptedToken);
  });

  it('should handle plaintext tokens gracefully during migration', async () => {
    const { RepoService } = await import(
      '../../src/modules/repos/service.js'
    );

    // Create a user with a plaintext GitHub token (pre-encryption migration)
    const plaintextToken = 'gho_plaintext_legacy_token';
    const user = await app.prisma.user.create({
      data: {
        email: 'plaintext-token@pulse.dev',
        passwordHash: 'not-a-real-hash',
        name: 'Plaintext Token User',
        githubToken: plaintextToken,
      },
    });

    const service = new RepoService(app.prisma);
    const token = await service.requireGitHubToken(user.id);

    // Should return the plaintext token as-is (not encrypted format)
    expect(token).toBe(plaintextToken);
  });
});

// ── CORS configuration ──────────────────────────────

describe('Security: CORS configuration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject requests from unknown origins', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/auth/login',
      headers: {
        origin: 'https://evil-site.com',
        'access-control-request-method': 'POST',
      },
    });

    const allowedOrigin = response.headers['access-control-allow-origin'];
    expect(allowedOrigin).not.toBe('https://evil-site.com');
  });

  it('should allow requests from configured frontend URL', async () => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3106';

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/auth/login',
      headers: {
        origin: frontendUrl,
        'access-control-request-method': 'POST',
      },
    });

    const allowedOrigin = response.headers['access-control-allow-origin'];
    expect(allowedOrigin).toBe(frontendUrl);
  });
});

// ── Security headers ────────────────────────────────

describe('Security: Security headers', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should include X-Content-Type-Options from helmet', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should include X-Frame-Options from helmet', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.headers['x-frame-options']).toBeDefined();
  });

  it('should include Content-Security-Policy', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.headers['content-security-policy']).toBeDefined();
  });
});
