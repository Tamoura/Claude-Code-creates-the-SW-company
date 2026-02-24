/**
 * Auth endpoint integration tests
 *
 * Tests register, login, lockout, refresh, logout, /me,
 * forgot-password, reset-password, and verify-email.
 */

import { FastifyInstance } from 'fastify';
import { getApp, closeApp, cleanDatabase, authHeaders, getPrisma } from '../helpers';

describe('Auth endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  // ==================== REGISTER ====================

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'new@test.com',
          password: 'Test123!@#',
          fullName: 'New User',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.message).toContain('Account created');
      expect(body.userId).toBeDefined();
    });

    it('should normalize email to lowercase', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'UPPER@TEST.COM',
          password: 'Test123!@#',
          fullName: 'Upper User',
        },
      });

      expect(res.statusCode).toBe(201);

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { email: 'upper@test.com' },
      });
      expect(user).not.toBeNull();
      expect(user!.email).toBe('upper@test.com');
    });

    it('should store hashed verification token with 24h expiry', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'verify@test.com',
          password: 'Test123!@#',
          fullName: 'Verify User',
        },
      });

      expect(res.statusCode).toBe(201);

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { email: 'verify@test.com' },
      });
      expect(user!.verificationToken).not.toBeNull();
      expect(user!.verificationToken!.length).toBe(64); // SHA-256 hex
      expect(user!.verificationExpires).not.toBeNull();
      const expiryDiff = user!.verificationExpires!.getTime() - Date.now();
      expect(expiryDiff).toBeGreaterThan(23 * 60 * 60 * 1000); // > 23h
      expect(expiryDiff).toBeLessThanOrEqual(24 * 60 * 60 * 1000); // <= 24h
    });

    it('should auto-create a personal workspace for the new user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'workspace@test.com',
          password: 'Test123!@#',
          fullName: 'Workspace User',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();

      const prisma = getPrisma();
      const workspace = await prisma.workspace.findFirst({
        where: { ownerId: body.userId },
        include: { members: true },
      });

      expect(workspace).not.toBeNull();
      expect(workspace!.name).toBe('Personal Workspace');
      expect(workspace!.slug).toContain('personal-');
      expect(workspace!.plan).toBe('free');
      expect(workspace!.members).toHaveLength(1);
      expect(workspace!.members[0].userId).toBe(body.userId);
      expect(workspace!.members[0].role).toBe('owner');
    });

    it('should return 409 for duplicate email', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'dup@test.com',
          password: 'Test123!@#',
          fullName: 'First User',
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'dup@test.com',
          password: 'Test123!@#',
          fullName: 'Second User',
        },
      });

      expect(res.statusCode).toBe(409);
    });

    it('should reject weak password (no uppercase)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'weak@test.com',
          password: 'test123!@#',
          fullName: 'Weak User',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should reject password shorter than 8 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'short@test.com',
          password: 'Te1!',
          fullName: 'Short User',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should create user with status registered', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'status@test.com',
          password: 'Test123!@#',
          fullName: 'Status User',
        },
      });

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { email: 'status@test.com' },
      });
      expect(user!.status).toBe('registered');
    });

    it('should reject invalid email format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'not-an-email',
          password: 'Test123!@#',
          fullName: 'Bad Email',
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ==================== LOGIN ====================

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'login@test.com',
          password: 'Test123!@#',
          fullName: 'Login User',
        },
      });
    });

    it('should return access token and user summary', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'login@test.com', password: 'Test123!@#' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.accessToken).toBeDefined();
      expect(body.expiresAt).toBeDefined();
      expect(body.user.email).toBe('login@test.com');
      expect(body.user.fullName).toBe('Login User');
      expect(body.user.role).toBe('member');
    });

    it('should set refresh token as httpOnly cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'login@test.com', password: 'Test123!@#' },
      });

      expect(res.statusCode).toBe(200);
      const cookies = res.cookies || [];
      const refreshCookie = cookies.find(
        (c: { name: string }) => c.name === 'refreshToken'
      );
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie!.httpOnly).toBe(true);
      expect(refreshCookie!.path).toBe('/api/v1/auth');
    });

    it('should create a session in the database', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'login@test.com', password: 'Test123!@#' },
      });

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { email: 'login@test.com' },
      });
      const sessions = await prisma.session.findMany({
        where: { userId: user!.id },
      });
      expect(sessions.length).toBe(1);
      expect(sessions[0].tokenHash).toBeDefined();
      expect(sessions[0].jti).toBeDefined();
    });

    it('should update lastLoginAt', async () => {
      const before = new Date();
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'login@test.com', password: 'Test123!@#' },
      });

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { email: 'login@test.com' },
      });
      expect(user!.lastLoginAt).not.toBeNull();
      expect(user!.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    });

    it('should return 401 for wrong password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'login@test.com', password: 'WrongPass1!' },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== ACCOUNT LOCKOUT ====================

  describe('Account lockout', () => {
    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'lockout@test.com',
          password: 'Test123!@#',
          fullName: 'Lockout User',
        },
      });
    });

    it('should increment failed login attempts', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'lockout@test.com', password: 'Wrong1!' },
      });

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { email: 'lockout@test.com' },
      });
      expect(user!.failedLoginAttempts).toBe(1);
    });

    it('should lock account after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: 'lockout@test.com', password: 'Wrong1!' },
        });
      }

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { email: 'lockout@test.com' },
      });
      expect(user!.failedLoginAttempts).toBe(5);
      expect(user!.lockedUntil).not.toBeNull();
    });

    it('should reject login during lockout with 423', async () => {
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: 'lockout@test.com', password: 'Wrong1!' },
        });
      }

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'lockout@test.com', password: 'Test123!@#' },
      });

      expect(res.statusCode).toBe(423);
      const body = res.json();
      expect(body.detail || body.message).toContain('locked');
    });

    it('should reset counters on successful login', async () => {
      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: 'lockout@test.com', password: 'Wrong1!' },
        });
      }

      // Succeed
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'lockout@test.com', password: 'Test123!@#' },
      });

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { email: 'lockout@test.com' },
      });
      expect(user!.failedLoginAttempts).toBe(0);
      expect(user!.lockedUntil).toBeNull();
    });

    it('should allow login after lockout expires', async () => {
      const prisma = getPrisma();
      // Manually set lockout in the past
      const user = await prisma.user.findUnique({
        where: { email: 'lockout@test.com' },
      });
      await prisma.user.update({
        where: { id: user!.id },
        data: {
          failedLoginAttempts: 5,
          lockedUntil: new Date(Date.now() - 1000), // expired
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'lockout@test.com', password: 'Test123!@#' },
      });

      expect(res.statusCode).toBe(200);
    });
  });

  // ==================== REFRESH ====================

  describe('POST /api/v1/auth/refresh', () => {
    it('should return new access token with valid refresh cookie', async () => {
      // Register and login to get refresh cookie
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'refresh@test.com',
          password: 'Test123!@#',
          fullName: 'Refresh User',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'refresh@test.com', password: 'Test123!@#' },
      });

      const cookies = loginRes.cookies || [];
      const refreshCookie = cookies.find(
        (c: { name: string }) => c.name === 'refreshToken'
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: { refreshToken: refreshCookie!.value },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.accessToken).toBeDefined();
      expect(body.expiresAt).toBeDefined();
    });

    it('should set new refresh token cookie (rotation)', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'rotate@test.com',
          password: 'Test123!@#',
          fullName: 'Rotate User',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'rotate@test.com', password: 'Test123!@#' },
      });

      const loginCookies = loginRes.cookies || [];
      const oldCookie = loginCookies.find(
        (c: { name: string }) => c.name === 'refreshToken'
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: { refreshToken: oldCookie!.value },
      });

      const newCookies = res.cookies || [];
      const newCookie = newCookies.find(
        (c: { name: string }) => c.name === 'refreshToken'
      );
      expect(newCookie).toBeDefined();
      expect(newCookie!.value).not.toBe(oldCookie!.value);
    });

    it('should return 401 for missing refresh cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: { refreshToken: 'invalid-token' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for revoked session', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'revoked@test.com',
          password: 'Test123!@#',
          fullName: 'Revoked User',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'revoked@test.com', password: 'Test123!@#' },
      });

      const cookies = loginRes.cookies || [];
      const refreshCookie = cookies.find(
        (c: { name: string }) => c.name === 'refreshToken'
      );

      // Revoke all sessions
      const prisma = getPrisma();
      await prisma.session.updateMany({
        data: { revokedAt: new Date() },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: { refreshToken: refreshCookie!.value },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== LOGOUT ====================

  describe('POST /api/v1/auth/logout', () => {
    it('should return 200 with valid auth token', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'logout@test.com',
          password: 'Test123!@#',
          fullName: 'Logout User',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'logout@test.com', password: 'Test123!@#' },
      });

      const { accessToken } = loginRes.json();

      // Need to make user active for authenticate to pass
      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'logout@test.com' },
        data: { status: 'active' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: authHeaders(accessToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().message).toContain('Logged out');
    });

    it('should revoke the session', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'logout-sess@test.com',
          password: 'Test123!@#',
          fullName: 'Logout Session',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'logout-sess@test.com', password: 'Test123!@#' },
      });

      const { accessToken } = loginRes.json();
      const cookies = loginRes.cookies || [];
      const refreshCookie = cookies.find(
        (c: { name: string }) => c.name === 'refreshToken'
      );

      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'logout-sess@test.com' },
        data: { status: 'active' },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: authHeaders(accessToken),
        cookies: { refreshToken: refreshCookie?.value || '' },
      });

      const sessions = await prisma.session.findMany({
        where: { revokedAt: { not: null } },
      });
      expect(sessions.length).toBeGreaterThan(0);
    });

    it('should clear refresh token cookie', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'logout-cookie@test.com',
          password: 'Test123!@#',
          fullName: 'Logout Cookie',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'logout-cookie@test.com', password: 'Test123!@#' },
      });

      const { accessToken } = loginRes.json();
      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'logout-cookie@test.com' },
        data: { status: 'active' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: authHeaders(accessToken),
      });

      const cookies = res.cookies || [];
      const cleared = cookies.find(
        (c: { name: string }) => c.name === 'refreshToken'
      );
      // Cookie should be cleared (empty value or expired)
      if (cleared) {
        expect(
          cleared.value === '' ||
          (cleared.expires && new Date(cleared.expires) < new Date())
        ).toBe(true);
      }
    });

    it('should return 401 without auth token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 200 even without refresh cookie', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'logout-nocookie@test.com',
          password: 'Test123!@#',
          fullName: 'No Cookie',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'logout-nocookie@test.com', password: 'Test123!@#' },
      });

      const { accessToken } = loginRes.json();
      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'logout-nocookie@test.com' },
        data: { status: 'active' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: authHeaders(accessToken),
        // No refresh cookie
      });

      expect(res.statusCode).toBe(200);
    });
  });

  // ==================== GET /ME ====================

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile when authenticated', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'me@test.com',
          password: 'Test123!@#',
          fullName: 'Me User',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'me@test.com', password: 'Test123!@#' },
      });

      const { accessToken } = loginRes.json();
      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'me@test.com' },
        data: { status: 'active' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: authHeaders(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.email).toBe('me@test.com');
      expect(body.fullName).toBe('Me User');
      expect(body.role).toBe('member');
      expect(body.id).toBeDefined();
      expect(body.createdAt).toBeDefined();
    });

    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: authHeaders('invalid-token'),
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== FORGOT PASSWORD ====================

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should return success for existing email', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'forgot@test.com',
          password: 'Test123!@#',
          fullName: 'Forgot User',
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'forgot@test.com' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().message).toContain('reset link');
    });

    it('should return same success for non-existing email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'nonexistent@test.com' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().message).toContain('reset link');
    });

    it('should store hashed reset token with 1h expiry', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'reset-token@test.com',
          password: 'Test123!@#',
          fullName: 'Reset Token User',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'reset-token@test.com' },
      });

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { email: 'reset-token@test.com' },
      });
      expect(user!.resetToken).not.toBeNull();
      expect(user!.resetToken!.length).toBe(64); // SHA-256 hex
      expect(user!.resetTokenExpires).not.toBeNull();
      const expiryDiff = user!.resetTokenExpires!.getTime() - Date.now();
      expect(expiryDiff).toBeGreaterThan(55 * 60 * 1000); // > 55min
      expect(expiryDiff).toBeLessThanOrEqual(60 * 60 * 1000); // <= 1h
    });

    it('should reject invalid email format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'not-valid' },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ==================== RESET PASSWORD ====================

  describe('POST /api/v1/auth/reset-password', () => {
    let resetTokenRaw: string;

    async function setupResetToken() {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'resetpw@test.com',
          password: 'Test123!@#',
          fullName: 'Reset PW User',
        },
      });

      // Generate token directly via crypto to get the raw token
      const crypto = await import('crypto');
      resetTokenRaw = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(resetTokenRaw).digest('hex');

      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'resetpw@test.com' },
        data: {
          resetToken: tokenHash,
          resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
    }

    it('should reset password with valid token', async () => {
      await setupResetToken();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: resetTokenRaw,
          password: 'NewPass123!@#',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().message).toContain('reset successfully');

      // Verify can login with new password
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'resetpw@test.com', password: 'NewPass123!@#' },
      });
      expect(loginRes.statusCode).toBe(200);
    });

    it('should return 400 for expired token', async () => {
      await setupResetToken();
      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'resetpw@test.com' },
        data: { resetTokenExpires: new Date(Date.now() - 1000) },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: resetTokenRaw,
          password: 'NewPass123!@#',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for invalid token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: 'totally-invalid-token',
          password: 'NewPass123!@#',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should invalidate all sessions after reset', async () => {
      await setupResetToken();

      // Create a session
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'resetpw@test.com', password: 'Test123!@#' },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: resetTokenRaw,
          password: 'NewPass123!@#',
        },
      });

      const prisma = getPrisma();
      const activeSessions = await prisma.session.findMany({
        where: {
          user: { email: 'resetpw@test.com' },
          revokedAt: null,
        },
      });
      expect(activeSessions.length).toBe(0);
    });

    it('should clear lockout state after reset', async () => {
      await setupResetToken();

      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'resetpw@test.com' },
        data: {
          failedLoginAttempts: 5,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: resetTokenRaw,
          password: 'NewPass123!@#',
        },
      });

      const user = await prisma.user.findUnique({
        where: { email: 'resetpw@test.com' },
      });
      expect(user!.failedLoginAttempts).toBe(0);
      expect(user!.lockedUntil).toBeNull();
    });

    it('should be one-time use (clear token after use)', async () => {
      await setupResetToken();

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: resetTokenRaw,
          password: 'NewPass123!@#',
        },
      });

      // Second use should fail
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: resetTokenRaw,
          password: 'AnotherPass1!',
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should reject weak new password', async () => {
      await setupResetToken();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: resetTokenRaw,
          password: 'weak',
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ==================== VERIFY EMAIL ====================

  describe('GET /api/v1/auth/verify-email/:token', () => {
    let verifyTokenRaw: string;

    async function setupVerifyToken() {
      const crypto = await import('crypto');
      verifyTokenRaw = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(verifyTokenRaw).digest('hex');

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'verifyemail@test.com',
          password: 'Test123!@#',
          fullName: 'Verify Email User',
        },
      });

      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'verifyemail@test.com' },
        data: {
          verificationToken: tokenHash,
          verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }

    it('should verify email with valid token', async () => {
      await setupVerifyToken();

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/verify-email/${verifyTokenRaw}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().message).toContain('verified');

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { email: 'verifyemail@test.com' },
      });
      expect(user!.emailVerified).toBe(true);
      expect(user!.status).toBe('active');
      expect(user!.verificationToken).toBeNull();
    });

    it('should return 400 for expired token', async () => {
      await setupVerifyToken();
      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'verifyemail@test.com' },
        data: { verificationExpires: new Date(Date.now() - 1000) },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/verify-email/${verifyTokenRaw}`,
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for invalid token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/verify-email/totally-invalid-token',
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for already verified email', async () => {
      await setupVerifyToken();
      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'verifyemail@test.com' },
        data: { emailVerified: true },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/verify-email/${verifyTokenRaw}`,
      });

      expect(res.statusCode).toBe(400);
    });

    it('should be one-time use (token cleared after verification)', async () => {
      await setupVerifyToken();

      await app.inject({
        method: 'GET',
        url: `/api/v1/auth/verify-email/${verifyTokenRaw}`,
      });

      // Second use should fail
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/verify-email/${verifyTokenRaw}`,
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ==================== AUDIT LOGGING ====================

  describe('Audit logging', () => {
    it('should log register event', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'audit-reg@test.com',
          password: 'Test123!@#',
          fullName: 'Audit Reg',
        },
      });

      const prisma = getPrisma();
      const logs = await prisma.auditLog.findMany({
        where: { action: 'register' },
      });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].resourceType).toBe('user');
    });

    it('should log login success event', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'audit-login@test.com',
          password: 'Test123!@#',
          fullName: 'Audit Login',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'audit-login@test.com', password: 'Test123!@#' },
      });

      const prisma = getPrisma();
      const logs = await prisma.auditLog.findMany({
        where: { action: 'login_success' },
      });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should log login failure event', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'audit-fail@test.com',
          password: 'Test123!@#',
          fullName: 'Audit Fail',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'audit-fail@test.com', password: 'Wrong1!' },
      });

      const prisma = getPrisma();
      const logs = await prisma.auditLog.findMany({
        where: { action: 'login_failure' },
      });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should log logout event', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'audit-logout@test.com',
          password: 'Test123!@#',
          fullName: 'Audit Logout',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'audit-logout@test.com', password: 'Test123!@#' },
      });

      const { accessToken } = loginRes.json();
      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'audit-logout@test.com' },
        data: { status: 'active' },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: authHeaders(accessToken),
      });

      const logs = await prisma.auditLog.findMany({
        where: { action: 'logout' },
      });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should log forgot-password event', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'audit-forgot@test.com',
          password: 'Test123!@#',
          fullName: 'Audit Forgot',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'audit-forgot@test.com' },
      });

      const prisma = getPrisma();
      const logs = await prisma.auditLog.findMany({
        where: { action: 'forgot_password' },
      });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should log password reset event', async () => {
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'audit-reset@test.com',
          password: 'Test123!@#',
          fullName: 'Audit Reset',
        },
      });

      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'audit-reset@test.com' },
        data: {
          resetToken: tokenHash,
          resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: { token: resetToken, password: 'NewPass123!@#' },
      });

      const logs = await prisma.auditLog.findMany({
        where: { action: 'reset_password' },
      });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should not include PII in metadata', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'audit-pii@test.com',
          password: 'Test123!@#',
          fullName: 'Audit PII',
        },
      });

      const prisma = getPrisma();
      const logs = await prisma.auditLog.findMany({
        where: { action: 'register' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      const metadata = logs[0].metadata as Record<string, unknown>;
      const metadataStr = JSON.stringify(metadata);
      expect(metadataStr).not.toContain('Test123');
      expect(metadataStr).not.toContain('password');
    });
  });

  // ==================== JTI BLACKLIST ====================

  describe('JTI blacklist', () => {
    it('should reject blacklisted access token after logout', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'blacklist@test.com',
          password: 'Test123!@#',
          fullName: 'Blacklist User',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'blacklist@test.com', password: 'Test123!@#' },
      });

      const { accessToken } = loginRes.json();
      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'blacklist@test.com' },
        data: { status: 'active' },
      });

      // Logout (blacklists JTI)
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: authHeaders(accessToken),
      });

      // Try to use the same token
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: authHeaders(accessToken),
      });

      expect(res.statusCode).toBe(401);
    });

    it('should allow non-blacklisted tokens', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'nonblack@test.com',
          password: 'Test123!@#',
          fullName: 'Non Blacklist',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'nonblack@test.com', password: 'Test123!@#' },
      });

      const { accessToken } = loginRes.json();
      const prisma = getPrisma();
      await prisma.user.updateMany({
        where: { email: 'nonblack@test.com' },
        data: { status: 'active' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: authHeaders(accessToken),
      });

      expect(res.statusCode).toBe(200);
    });
  });
});
