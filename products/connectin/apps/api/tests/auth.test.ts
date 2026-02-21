import {
  getApp,
  closeApp,
  cleanDatabase,
  getPrisma,
  authHeaders,
} from './helpers';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

describe('Auth Module', () => {
  describe('POST /api/v1/auth/register', () => {
    it('registers a new user', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'ahmed@example.com',
          password: 'SecureP@ss1',
          displayName: 'Ahmed Al-Rashidi',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.userId).toBeDefined();
      expect(body.data.email).toBe('ahmed@example.com');
      expect(body.data.message).toContain('Verification');
    });

    it('returns success for duplicate email (prevents enumeration)', async () => {
      const app = await getApp();
      const payload = {
        email: 'duplicate@example.com',
        password: 'SecureP@ss1',
        displayName: 'First User',
      };

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          ...payload,
          displayName: 'Second User',
        },
      });

      // Should return 201 with same shape to prevent user enumeration
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toContain('Verification');
    });

    it('rejects weak password', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'weak@example.com',
          password: 'short',
          displayName: 'Weak User',
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid email', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'not-an-email',
          password: 'SecureP@ss1',
          displayName: 'Invalid Email',
        },
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const app = await getApp();
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'login@example.com',
          password: 'SecureP@ss1',
          displayName: 'Login User',
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'SecureP@ss1',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.user.email).toBe(
        'login@example.com'
      );
      expect(body.data.user.role).toBe('USER');
    });

    it('rejects wrong password', async () => {
      const app = await getApp();
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'wrongpw@example.com',
          password: 'SecureP@ss1',
          displayName: 'Wrong PW',
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'wrongpw@example.com',
          password: 'WrongP@ss1',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects non-existent user', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'noone@example.com',
          password: 'SecureP@ss1',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('refreshes token with valid refresh token',
      async () => {
        const app = await getApp();
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/register',
          payload: {
            email: 'refresh@example.com',
            password: 'SecureP@ss1',
            displayName: 'Refresh User',
          },
        });

        const loginRes = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: {
            email: 'refresh@example.com',
            password: 'SecureP@ss1',
          },
        });

        // Extract refresh token from httpOnly cookie
        const cookies = loginRes.cookies;
        const refreshCookie = cookies.find(
          (c: { name: string }) =>
            c.name === 'refreshToken'
        );

        expect(refreshCookie).toBeDefined();

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/refresh',
          payload: {
            refreshToken: refreshCookie!.value,
          },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.accessToken).toBeDefined();
      }
    );
  });

  describe('POST /api/v1/auth/logout', () => {
    it('logs out authenticated user', async () => {
      const app = await getApp();
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'logout@example.com',
          password: 'SecureP@ss1',
          displayName: 'Logout User',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'logout@example.com',
          password: 'SecureP@ss1',
        },
      });

      const { accessToken } = JSON.parse(
        loginRes.body
      ).data;

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: authHeaders(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.message).toBe(
        'Logged out successfully'
      );
    });

    it('rejects unauthenticated logout', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/auth/verify-email/:token',
    () => {
      it('verifies email with valid token', async () => {
        const app = await getApp();
        const crypto = await import('crypto');
        const bcrypt = await import('bcrypt');

        // Create user directly with a known verification token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto
          .createHash('sha256')
          .update(rawToken)
          .digest('hex');
        const passwordHash = await bcrypt.hash('SecureP@ss1', 10);

        const db = getPrisma();
        await db.user.create({
          data: {
            email: 'verify@example.com',
            passwordHash,
            displayName: 'Verify User',
            verificationToken: tokenHash,
            verificationExpires: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ),
            profile: { create: { completenessScore: 0 } },
          },
        });

        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/auth/verify-email/${rawToken}`,
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.message).toBe(
          'Email verified successfully'
        );
        expect(body.data.accessToken).toBeDefined();
        expect(body.data.redirectTo).toBe(
          '/profile/setup'
        );
      });

      it('rejects invalid token', async () => {
        const app = await getApp();
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/auth/verify-email/invalid-token',
        });

        expect(res.statusCode).toBe(400);
      });
    }
  );
});
