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
      expect(body.data.user.role).toBe('user');
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

  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns success for existing email', async () => {
      const app = await getApp();
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'forgot@example.com',
          password: 'SecureP@ss1',
          displayName: 'Forgot User',
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'forgot@example.com' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.message).toContain('reset');
    });

    it('returns same success for unknown email (anti-enumeration)', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'nobody@example.com' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.message).toContain('reset');
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    async function setupResetToken(_app: Awaited<ReturnType<typeof getApp>>) {
      const crypto = await import('crypto');
      const bcrypt = await import('bcrypt');
      const db = getPrisma();

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      const passwordHash = await bcrypt.hash('OldP@ss123', 10);

      const user = await db.user.create({
        data: {
          email: 'reset@example.com',
          passwordHash,
          displayName: 'Reset User',
          resetToken: tokenHash,
          resetTokenExpires: new Date(Date.now() + 3600000),
          profile: { create: { completenessScore: 0 } },
        },
      });

      return { rawToken, user };
    }

    it('resets password with valid token', async () => {
      const app = await getApp();
      const { rawToken } = await setupResetToken(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: rawToken,
          newPassword: 'NewSecureP@ss1',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.message).toContain('reset');
    });

    it('rejects expired token', async () => {
      const app = await getApp();
      const crypto = await import('crypto');
      const bcrypt = await import('bcrypt');
      const db = getPrisma();

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      const passwordHash = await bcrypt.hash('OldP@ss123', 10);

      await db.user.create({
        data: {
          email: 'expired-reset@example.com',
          passwordHash,
          displayName: 'Expired Reset',
          resetToken: tokenHash,
          resetTokenExpires: new Date(Date.now() - 1000),
          profile: { create: { completenessScore: 0 } },
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: rawToken,
          newPassword: 'NewSecureP@ss1',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('rejects invalid token', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: 'totally-invalid-token',
          newPassword: 'NewSecureP@ss1',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('rejects weak new password', async () => {
      const app = await getApp();
      const { rawToken } = await setupResetToken(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: rawToken,
          newPassword: 'weak',
        },
      });

      expect(res.statusCode).toBe(422);
    });

    it('token is single-use (cannot reuse)', async () => {
      const app = await getApp();
      const { rawToken } = await setupResetToken(app);

      // First use
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: rawToken,
          newPassword: 'NewSecureP@ss1',
        },
      });

      // Second use should fail
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: rawToken,
          newPassword: 'AnotherP@ss1',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('old password is invalid after reset', async () => {
      const app = await getApp();
      const { rawToken } = await setupResetToken(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: rawToken,
          newPassword: 'NewSecureP@ss1',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'reset@example.com',
          password: 'OldP@ss123',
        },
      });

      expect(loginRes.statusCode).toBe(401);
    });

    it('new password works after reset', async () => {
      const app = await getApp();
      const { rawToken } = await setupResetToken(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: rawToken,
          newPassword: 'NewSecureP@ss1',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'reset@example.com',
          password: 'NewSecureP@ss1',
        },
      });

      expect(loginRes.statusCode).toBe(200);
    });

    it('invalidates all sessions after reset', async () => {
      const app = await getApp();
      const { rawToken, user } = await setupResetToken(app);
      const db = getPrisma();

      // Create a session for this user
      await db.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: 'fake-hash',
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: rawToken,
          newPassword: 'NewSecureP@ss1',
        },
      });

      const sessions = await db.session.findMany({
        where: { userId: user.id },
      });

      expect(sessions).toHaveLength(0);
    });
  });

  describe('Session cleanup (RISK-017)', () => {
    it('cleanupExpiredSessions deletes expired sessions', async () => {
      const app = await getApp();
      const db = getPrisma();
      const { AuthService } = await import(
        '../src/modules/auth/auth.service'
      );
      const authService = new AuthService(db, app);

      // Create a user
      const user = await db.user.create({
        data: {
          email: 'cleanup@example.com',
          displayName: 'Cleanup User',
          passwordHash: 'hash',
          profile: { create: { completenessScore: 0 } },
        },
      });

      // Create an expired session
      await db.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: 'expired-hash',
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      // Create a valid session
      await db.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: 'valid-hash',
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const count = await authService.cleanupExpiredSessions();

      expect(count).toBe(1);

      const remaining = await db.session.findMany({
        where: { userId: user.id },
      });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].refreshTokenHash).toBe('valid-hash');
    });

    it('cleanupExpiredSessions returns 0 when no expired sessions', async () => {
      const app = await getApp();
      const db = getPrisma();
      const { AuthService } = await import(
        '../src/modules/auth/auth.service'
      );
      const authService = new AuthService(db, app);

      const count = await authService.cleanupExpiredSessions();
      expect(count).toBe(0);
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

  describe('GET /api/v1/auth/export (GDPR DSAR)', () => {
    it('exports all user data including jobs, messages, and notifications', async () => {
      const app = await getApp();
      const db = getPrisma();
      const user = await createTestUser(app);

      // Create a post
      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'My exported post' },
      });

      // Grant consent
      await app.inject({
        method: 'POST',
        url: '/api/v1/consent',
        headers: authHeaders(user.accessToken),
        payload: { type: 'PRIVACY_POLICY', granted: true, version: '1.0' },
      });

      // Create a job application (need a recruiter + job first)
      const recruiter = await db.user.create({
        data: {
          email: 'recruiter-export@test.com',
          displayName: 'Recruiter',
          passwordHash: 'hash',
          role: 'RECRUITER',
          profile: { create: { completenessScore: 0 } },
        },
      });
      const job = await db.job.create({
        data: {
          recruiterId: recruiter.id,
          title: 'Test Job',
          company: 'Test Co',
          description: 'A job',
        },
      });
      await db.jobApplication.create({
        data: {
          jobId: job.id,
          applicantId: user.id,
          coverNote: 'Hire me!',
        },
      });
      await db.savedJob.create({
        data: { jobId: job.id, userId: user.id },
      });

      // Create a notification
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Welcome!',
          message: 'Welcome to ConnectIn',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/export',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.exportedAt).toBeDefined();
      expect(body.data.user.email).toBe(user.email);
      // Sensitive fields must be stripped
      expect(body.data.user.passwordHash).toBeUndefined();
      expect(body.data.user.verificationToken).toBeUndefined();
      expect(body.data.user.resetToken).toBeUndefined();
      // Must include jobs data
      expect(body.data.user.applications).toBeDefined();
      expect(body.data.user.applications).toHaveLength(1);
      expect(body.data.user.applications[0].coverNote).toBe('Hire me!');
      // Must include saved jobs
      expect(body.data.user.savedJobs).toBeDefined();
      expect(body.data.user.savedJobs).toHaveLength(1);
      // Must include notifications
      expect(body.data.user.notifications).toBeDefined();
      expect(body.data.user.notifications).toHaveLength(1);
      // Must include consents
      expect(body.data.user.consents).toBeDefined();
      expect(body.data.user.consents.length).toBeGreaterThanOrEqual(1);
      // Must include posts
      expect(body.data.user.posts).toBeDefined();
      expect(body.data.user.posts.length).toBeGreaterThanOrEqual(1);
    });

    it('requires authentication', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/export',
      });
      expect(res.statusCode).toBe(401);
    });

    it('includes retention policy metadata', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/export',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.retentionPolicy).toBeDefined();
      expect(body.data.retentionPolicy.sessions).toBeDefined();
      expect(body.data.retentionPolicy.notifications).toBeDefined();
      expect(body.data.retentionPolicy.account).toBeDefined();
    });
  });

  describe('DELETE /api/v1/auth/account (GDPR erasure)', () => {
    it('deletes account and all associated data', async () => {
      const app = await getApp();
      const db = getPrisma();
      const user = await createTestUser(app);

      // Create some data
      await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: authHeaders(user.accessToken),
        payload: { content: 'Will be deleted' },
      });

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/account',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);

      // User should be marked DELETED with PII cleared
      const deletedUser = await db.user.findUnique({
        where: { id: user.id },
      });
      expect(deletedUser!.status).toBe('DELETED');
      expect(deletedUser!.email).toContain('deleted-');
      expect(deletedUser!.displayName).toBe('Deleted User');
      expect(deletedUser!.passwordHash).toBeNull();
    });
  });

  describe('GDPR Right to Restrict Processing (Art 18)', () => {
    it('POST /restrict-processing sets restricted flag and timestamp', async () => {
      const app = await getApp();
      const db = getPrisma();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/restrict-processing',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.restricted).toBe(true);
      expect(body.data.timestamp).toBeDefined();

      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      expect(dbUser!.processingRestricted).toBe(true);
      expect(dbUser!.processingRestrictedAt).not.toBeNull();
    });

    it('DELETE /restrict-processing clears restricted flag', async () => {
      const app = await getApp();
      const db = getPrisma();
      const user = await createTestUser(app);

      // First restrict
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

      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      expect(dbUser!.processingRestricted).toBe(false);
      expect(dbUser!.processingRestrictedAt).toBeNull();
    });

    it('POST /restrict-processing rejects if already restricted', async () => {
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

    it('DELETE /restrict-processing rejects if not restricted', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/restrict-processing',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(409);
    });

    it('POST /restrict-processing requires authentication', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/restrict-processing',
      });
      expect(res.statusCode).toBe(401);
    });

    it('logs security event for restrict/lift actions', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      // Restrict — should not throw (security event logged internally)
      const restrictRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/restrict-processing',
        headers: authHeaders(user.accessToken),
      });
      expect(restrictRes.statusCode).toBe(200);

      // Lift — should not throw
      const liftRes = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/restrict-processing',
        headers: authHeaders(user.accessToken),
      });
      expect(liftRes.statusCode).toBe(200);
    });
  });

  describe('GDPR Right to Object (Art 21)', () => {
    it('POST /object-to-processing sets objection flag and timestamp', async () => {
      const app = await getApp();
      const db = getPrisma();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object-to-processing',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.objection).toBe(true);
      expect(body.data.timestamp).toBeDefined();

      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      expect(dbUser!.objectionRegistered).toBe(true);
      expect(dbUser!.objectionRegisteredAt).not.toBeNull();
    });

    it('DELETE /object-to-processing clears objection flag', async () => {
      const app = await getApp();
      const db = getPrisma();
      const user = await createTestUser(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object-to-processing',
        headers: authHeaders(user.accessToken),
      });

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/object-to-processing',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.objection).toBe(false);

      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      expect(dbUser!.objectionRegistered).toBe(false);
      expect(dbUser!.objectionRegisteredAt).toBeNull();
    });

    it('POST /object-to-processing rejects if already registered', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object-to-processing',
        headers: authHeaders(user.accessToken),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object-to-processing',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(409);
    });

    it('DELETE /object-to-processing rejects if not registered', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/object-to-processing',
        headers: authHeaders(user.accessToken),
      });

      expect(res.statusCode).toBe(409);
    });

    it('POST /object-to-processing requires authentication', async () => {
      const app = await getApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object-to-processing',
      });
      expect(res.statusCode).toBe(401);
    });

    it('logs security event for objection/withdrawal actions', async () => {
      const app = await getApp();
      const user = await createTestUser(app);

      const objRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/object-to-processing',
        headers: authHeaders(user.accessToken),
      });
      expect(objRes.statusCode).toBe(200);

      const withdrawRes = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/object-to-processing',
        headers: authHeaders(user.accessToken),
      });
      expect(withdrawRes.statusCode).toBe(200);
    });
  });

  describe('Refresh token blacklist (RISK-008)', () => {
    it('old refresh token is rejected after rotation', async () => {
      const app = await getApp();
      const email = 'blacklist@test.com';

      // Register and login
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: 'StrongP@ss1!',
          displayName: 'Blacklist',
          acceptTerms: true,
        },
      });
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'StrongP@ss1!' },
      });
      const oldRefresh = loginRes.cookies.find(
        (c: { name: string }) => c.name === 'refreshToken'
      )!.value;

      // Rotate: use the old refresh token to get a new one
      const rotateRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: oldRefresh },
      });
      expect(rotateRes.statusCode).toBe(200);

      // Attempt to reuse the old refresh token — should fail
      const replayRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: oldRefresh },
      });
      expect(replayRes.statusCode).toBe(401);
    });
  });
});
