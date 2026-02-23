import {
  getApp,
  closeApp,
  cleanDatabase,
  getPrisma,
  authHeaders,
  createTestUser,
} from './helpers';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('GDPR Art 18 — Right to Restrict Processing', () => {
  describe('POST /api/v1/auth/restrict-processing', () => {
    it('restricts processing for authenticated user', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/restrict-processing',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.restricted).toBe(true);

      // Verify in DB
      const db = getPrisma();
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
      });
      expect(dbUser!.processingRestricted).toBe(true);
      expect(dbUser!.processingRestrictedAt).toBeDefined();
    });

    it('requires authentication', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/restrict-processing',
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 409 when already restricted', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/restrict-processing',
        headers: authHeaders(user.accessToken),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/restrict-processing',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(409);
    });
  });

  describe('DELETE /api/v1/auth/restrict-processing', () => {
    it('lifts restriction for authenticated user', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      // Restrict first
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/restrict-processing',
        headers: authHeaders(user.accessToken),
      });

      // Then lift
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/restrict-processing',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.restricted).toBe(false);

      const db = getPrisma();
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
      });
      expect(dbUser!.processingRestricted).toBe(false);
      expect(dbUser!.processingRestrictedAt).toBeNull();
    });

    it('requires authentication', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/restrict-processing',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('restriction affects data export', () => {
    it('data export includes restriction status', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      // Restrict
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/restrict-processing',
        headers: authHeaders(user.accessToken),
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/export',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.user.processingRestricted).toBe(true);
      expect(body.data.user.processingRestrictedAt).toBeDefined();
    });
  });
});

describe('GDPR Art 21 — Right to Object', () => {
  describe('POST /api/v1/auth/object', () => {
    it('registers a processing objection', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object',
        headers: authHeaders(user.accessToken),
        payload: {
          type: 'PROFILING',
          reason: 'I do not want my data profiled',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.type).toBe('PROFILING');
      expect(body.data.objectedAt).toBeDefined();
    });

    it('requires authentication', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object',
        payload: { type: 'MARKETING' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects invalid objection type', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object',
        headers: authHeaders(user.accessToken),
        payload: { type: 'INVALID_TYPE' },
      });

      expect(res.statusCode).toBe(422);
    });

    it('is idempotent — objecting twice updates the objection', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object',
        headers: authHeaders(user.accessToken),
        payload: { type: 'MARKETING', reason: 'First reason' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object',
        headers: authHeaders(user.accessToken),
        payload: { type: 'MARKETING', reason: 'Updated reason' },
      });

      expect(res.statusCode).toBe(201);

      const db = getPrisma();
      const objections = await db.processingObjection.findMany({
        where: { userId: user.id, type: 'MARKETING' },
      });
      expect(objections).toHaveLength(1);
      expect(objections[0].reason).toBe('Updated reason');
      expect(objections[0].withdrawnAt).toBeNull();
    });
  });

  describe('DELETE /api/v1/auth/object/:type', () => {
    it('withdraws an existing objection', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      // Object first
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object',
        headers: authHeaders(user.accessToken),
        payload: { type: 'ANALYTICS' },
      });

      // Withdraw
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/object/ANALYTICS',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.message).toContain('withdrawn');

      const db = getPrisma();
      const objection = await db.processingObjection.findFirst({
        where: { userId: user.id, type: 'ANALYTICS' },
      });
      expect(objection!.withdrawnAt).toBeDefined();
    });

    it('returns 404 for non-existent objection', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/object/PROFILING',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(404);
    });

    it('requires authentication', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/object/MARKETING',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/auth/objections', () => {
    it('lists all active objections for the user', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      // Register two objections
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object',
        headers: authHeaders(user.accessToken),
        payload: { type: 'PROFILING' },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object',
        headers: authHeaders(user.accessToken),
        payload: { type: 'MARKETING' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/objections',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(2);
      expect(body.data.map((o: any) => o.type).sort()).toEqual(
        ['MARKETING', 'PROFILING']
      );
    });

    it('excludes withdrawn objections by default', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object',
        headers: authHeaders(user.accessToken),
        payload: { type: 'PROFILING' },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object',
        headers: authHeaders(user.accessToken),
        payload: { type: 'ANALYTICS' },
      });

      // Withdraw one
      await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/object/ANALYTICS',
        headers: authHeaders(user.accessToken),
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/objections',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].type).toBe('PROFILING');
    });

    it('requires authentication', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/objections',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('objections in data export', () => {
    it('data export includes processing objections', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object',
        headers: authHeaders(user.accessToken),
        payload: { type: 'MARKETING', reason: 'No marketing' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/export',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.user.processingObjections).toBeDefined();
      expect(body.data.user.processingObjections).toHaveLength(1);
      expect(body.data.user.processingObjections[0].type).toBe('MARKETING');
    });
  });
});
