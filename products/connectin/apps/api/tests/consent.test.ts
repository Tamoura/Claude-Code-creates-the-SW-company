import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeaders,
} from './helpers';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('Consent Module', () => {
  describe('POST /api/v1/consent', () => {
    it('grants consent for a valid type', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/consent',
        headers: authHeaders(user.accessToken),
        payload: {
          type: 'TERMS_OF_SERVICE',
          granted: true,
          version: '1.0',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.type).toBe('TERMS_OF_SERVICE');
      expect(body.data.granted).toBe(true);
      expect(body.data.version).toBe('1.0');
      expect(body.data.grantedAt).not.toBeNull();
      expect(body.data.revokedAt).toBeNull();
    });

    it('revokes consent when granted is false', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      // First grant
      await app.inject({
        method: 'POST',
        url: '/api/v1/consent',
        headers: authHeaders(user.accessToken),
        payload: {
          type: 'MARKETING_EMAIL',
          granted: true,
          version: '1.0',
        },
      });

      // Then revoke
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/consent',
        headers: authHeaders(user.accessToken),
        payload: {
          type: 'MARKETING_EMAIL',
          granted: false,
          version: '1.0',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.granted).toBe(false);
      expect(body.data.revokedAt).not.toBeNull();
      expect(body.data.grantedAt).toBeNull();
    });

    it('upserts consent on repeated grants', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/consent',
        headers: authHeaders(user.accessToken),
        payload: { type: 'ANALYTICS', granted: true, version: '1.0' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/consent',
        headers: authHeaders(user.accessToken),
        payload: { type: 'ANALYTICS', granted: true, version: '2.0' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.version).toBe('2.0');
    });

    it('rejects invalid consent type', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/consent',
        headers: authHeaders(user.accessToken),
        payload: {
          type: 'INVALID_TYPE',
          granted: true,
          version: '1.0',
        },
      });

      expect(res.statusCode).toBe(422);
    });

    it('rejects missing version field', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/consent',
        headers: authHeaders(user.accessToken),
        payload: {
          type: 'TERMS_OF_SERVICE',
          granted: true,
        },
      });

      expect(res.statusCode).toBe(422);
    });

    it('rejects unauthenticated request', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/consent',
        payload: {
          type: 'TERMS_OF_SERVICE',
          granted: true,
          version: '1.0',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/consent', () => {
    it('returns empty list when no consents exist', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/consent',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('returns all consent records for the user', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/consent',
        headers: authHeaders(user.accessToken),
        payload: { type: 'TERMS_OF_SERVICE', granted: true, version: '1.0' },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/consent',
        headers: authHeaders(user.accessToken),
        payload: { type: 'PRIVACY_POLICY', granted: true, version: '1.0' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/consent',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(2);
      const types = body.data.map((c: { type: string }) => c.type);
      expect(types).toContain('TERMS_OF_SERVICE');
      expect(types).toContain('PRIVACY_POLICY');
    });

    it('only returns consents for the authenticated user', async () => {
      const app = await getApp();
      const user1 = await createTestUser(app);
      const user2 = await createTestUser(app);

      // user1 grants consent
      await app.inject({
        method: 'POST',
        url: '/api/v1/consent',
        headers: authHeaders(user1.accessToken),
        payload: { type: 'ANALYTICS', granted: true, version: '1.0' },
      });

      // user2 should see empty list
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/consent',
        headers: authHeaders(user2.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(0);
    });

    it('rejects unauthenticated request', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/consent',
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
