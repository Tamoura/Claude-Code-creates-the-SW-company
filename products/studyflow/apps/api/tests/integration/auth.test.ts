import { FastifyInstance } from 'fastify';
import { buildTestApp, extractSessionCookie } from '../helpers/app';
import { resetDatabase, closeTestDb, testPrisma } from '../helpers/db';

describe('Auth — US-01 (FR-001, FR-002, FR-003)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await app.close();
    await closeTestDb();
  });

  describe('POST /v1/auth/signup', () => {
    it('[US-01][AC-1] creates an account, signs in, sets session cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: { email: 'New.User@Test.Dev', password: 'SecurePass123!' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.student).toMatchObject({ email: 'new.user@test.dev' });
      expect(body.student.id).toEqual(expect.any(String));
      expect(body.student.activeTerm).toEqual(expect.any(String));
      // never leak the hash
      expect(body.student).not.toHaveProperty('passwordHash');

      const cookie = extractSessionCookie(res.headers['set-cookie']);
      expect(cookie).toMatch(/^sf_session=/);

      // a session row exists for the new student
      const student = await testPrisma.student.findUnique({
        where: { email: 'new.user@test.dev' },
      });
      expect(student).not.toBeNull();
      const sessions = await testPrisma.session.count({
        where: { studentId: student!.id },
      });
      expect(sessions).toBe(1);
      // password stored hashed, not plaintext
      expect(student!.passwordHash).not.toBe('SecurePass123!');
    });

    it('[US-01][AC-1] rejects a short password (400)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: { email: 'a@test.dev', password: 'short' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('[US-01][AC-1] rejects an invalid email (400)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: { email: 'not-an-email', password: 'SecurePass123!' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('[US-01][AC-2] rejects duplicate email with a non-enumerating 409', async () => {
      await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: { email: 'dupe@test.dev', password: 'SecurePass123!' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: { email: 'dupe@test.dev', password: 'SecurePass123!' },
      });
      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(JSON.stringify(body)).not.toMatch(/already registered|exists/i);
      // only one student created
      const count = await testPrisma.student.count({
        where: { email: 'dupe@test.dev' },
      });
      expect(count).toBe(1);
    });
  });

  describe('POST /v1/auth/login', () => {
    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: { email: 'login@test.dev', password: 'SecurePass123!' },
      });
    });

    it('[US-01][AC-3] logs in with correct credentials (200 + cookie)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'Login@test.dev', password: 'SecurePass123!' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().student.email).toBe('login@test.dev');
      expect(extractSessionCookie(res.headers['set-cookie'])).toMatch(
        /^sf_session=/
      );
    });

    it('[US-01][AC-3] rejects wrong password with generic 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'login@test.dev', password: 'WrongPass123!' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('[US-01][AC-3] rejects unknown email with the SAME generic 401 (non-enumerating)', async () => {
      const unknown = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'nobody@test.dev', password: 'SecurePass123!' },
      });
      const wrongPw = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'login@test.dev', password: 'WrongPass123!' },
      });
      expect(unknown.statusCode).toBe(401);
      expect(wrongPw.statusCode).toBe(401);
      expect(unknown.json().detail).toBe(wrongPw.json().detail);
    });
  });

  describe('GET /v1/auth/me + logout', () => {
    it('[US-01][AC-4] returns 401 with no session', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/auth/me' });
      expect(res.statusCode).toBe(401);
    });

    it('[US-01][AC-4] returns the current student with a valid session', async () => {
      const signup = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: { email: 'me@test.dev', password: 'SecurePass123!' },
      });
      const cookie = extractSessionCookie(signup.headers['set-cookie']);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/auth/me',
        headers: { cookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().student.email).toBe('me@test.dev');
    });

    it('[US-01] logout deletes the session (204) and invalidates the cookie', async () => {
      const signup = await app.inject({
        method: 'POST',
        url: '/v1/auth/signup',
        payload: { email: 'out@test.dev', password: 'SecurePass123!' },
      });
      const cookie = extractSessionCookie(signup.headers['set-cookie']);

      const logout = await app.inject({
        method: 'POST',
        url: '/v1/auth/logout',
        headers: { cookie },
      });
      expect(logout.statusCode).toBe(204);

      const after = await app.inject({
        method: 'GET',
        url: '/v1/auth/me',
        headers: { cookie },
      });
      expect(after.statusCode).toBe(401);
    });

    it('[US-01][AC-4] returns 401 for a malformed/unknown session token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/auth/me',
        headers: { cookie: 'sf_session=deadbeefdoesnotexist' },
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
