import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';
import { prisma } from '../setup';
import bcrypt from 'bcrypt';

/**
 * Admin auth integration tests
 *
 * Verifies that role is included in login/signup responses
 * and that the admin seed user gets role: "ADMIN".
 */

describe('Admin auth — role in responses', () => {
  let app: FastifyInstance;
  const testUA = `AdminAuthTest/${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();

    // Seed an admin user for login tests
    const passwordHash = await bcrypt.hash('Test123!@#', 10);
    await prisma.user.upsert({
      where: { email: 'admin-auth-test@test.com' },
      update: { role: 'ADMIN' },
      create: {
        email: 'admin-auth-test@test.com',
        passwordHash,
        role: 'ADMIN',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should include role: "MERCHANT" in signup response', async () => {
    const email = `signup-role-${Date.now()}@test.com`;
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { email, password: 'SecurePass123!' },
      headers: { 'user-agent': testUA },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.role).toBe('MERCHANT');
  });

  it('should include role: "ADMIN" in login response for admin user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'admin-auth-test@test.com',
        password: 'Test123!@#',
      },
      headers: { 'user-agent': testUA },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.role).toBe('ADMIN');
  });

  it('should include role: "MERCHANT" in login response for merchant user', async () => {
    // Sign up a merchant first
    const email = `merchant-role-${Date.now()}@test.com`;
    await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { email, password: 'SecurePass123!' },
      headers: { 'user-agent': `${testUA}-merchant` },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'SecurePass123!' },
      headers: { 'user-agent': `${testUA}-merchant-login` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.role).toBe('MERCHANT');
  });
});
