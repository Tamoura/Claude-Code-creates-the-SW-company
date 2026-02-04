import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';

describe('Auth Sessions API', () => {
  let app: FastifyInstance;
  let accessToken: string;
  const testUA = `SessionTest/${Date.now()}`;
  const signupUA = `SessionSignup/${Date.now()}`;
  const testEmail = `session_${Date.now()}@test.com`;

  beforeAll(async () => {
    app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { email: testEmail, password: 'SecurePass123!' },
      headers: { 'user-agent': signupUA },
    });
    accessToken = res.json().access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/auth/sessions', () => {
    it('should list active sessions', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/auth/sessions',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'user-agent': testUA,
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0]).toHaveProperty('id');
      expect(body.data[0]).toHaveProperty('created_at');
      expect(body.data[0]).toHaveProperty('expires_at');
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/auth/sessions',
        headers: { 'user-agent': testUA },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /v1/auth/sessions/:id', () => {
    it('should revoke a session', async () => {
      // Create a new session by logging in
      const loginUA = `SessionRevoke/${Date.now()}`;
      const loginRes = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: testEmail, password: 'SecurePass123!' },
        headers: { 'user-agent': loginUA },
      });
      const newToken = loginRes.json().access_token;

      // List sessions to get an ID
      const listRes = await app.inject({
        method: 'GET',
        url: '/v1/auth/sessions',
        headers: {
          authorization: `Bearer ${newToken}`,
          'user-agent': testUA,
        },
      });
      const sessions = listRes.json().data;
      const sessionToRevoke = sessions.find((s: any) => sessions.indexOf(s) > 0) || sessions[0];

      // Revoke it
      const revokeRes = await app.inject({
        method: 'DELETE',
        url: `/v1/auth/sessions/${sessionToRevoke.id}`,
        headers: {
          authorization: `Bearer ${newToken}`,
          'user-agent': testUA,
        },
      });
      expect(revokeRes.statusCode).toBe(204);
    });

    it('should return 404 for non-existent session', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/v1/auth/sessions/non-existent-id',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'user-agent': testUA,
        },
      });
      expect(res.statusCode).toBe(404);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/v1/auth/sessions/some-id',
        headers: { 'user-agent': testUA },
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
