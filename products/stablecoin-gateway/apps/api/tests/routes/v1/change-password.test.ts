import { buildApp } from '../../../src/app';
import { FastifyInstance } from 'fastify';

describe('POST /v1/auth/change-password', () => {
  let app: FastifyInstance;
  let accessToken: string;
  const testUA = `ChangePasswordTest/${Date.now()}`;
  const signupUA = `ChangePasswordSignup/${Date.now()}`;
  const testEmail = `changepw_${Date.now()}@test.com`;
  const originalPassword = 'OriginalPass123!';

  beforeAll(async () => {
    app = await buildApp();
    // Create a test user
    const signupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { email: testEmail, password: originalPassword },
      headers: { 'user-agent': signupUA },
    });
    const body = signupRes.json();
    accessToken = body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should change password with valid current password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/change-password',
      payload: {
        current_password: originalPassword,
        new_password: 'NewSecurePass123!',
      },
      headers: {
        authorization: `Bearer ${accessToken}`,
        'user-agent': testUA,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.message).toBe('Password changed successfully');
  });

  it('should reject with wrong current password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/change-password',
      payload: {
        current_password: 'WrongPassword123!',
        new_password: 'AnotherPass123!',
      },
      headers: {
        authorization: `Bearer ${accessToken}`,
        'user-agent': testUA,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject weak new password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/change-password',
      payload: {
        current_password: 'NewSecurePass123!',
        new_password: 'weak',
      },
      headers: {
        authorization: `Bearer ${accessToken}`,
        'user-agent': testUA,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should require authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/change-password',
      payload: {
        current_password: originalPassword,
        new_password: 'NewSecurePass123!',
      },
      headers: { 'user-agent': testUA },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should allow login with new password after change', async () => {
    const loginUA = `ChangePasswordLogin/${Date.now()}`;
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: testEmail,
        password: 'NewSecurePass123!',
      },
      headers: { 'user-agent': loginUA },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('access_token');
  });

  it('should reject login with old password after change', async () => {
    const loginUA = `ChangePasswordLoginOld/${Date.now()}`;
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: testEmail,
        password: originalPassword,
      },
      headers: { 'user-agent': loginUA },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should validate request body schema', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/change-password',
      payload: {},
      headers: {
        authorization: `Bearer ${accessToken}`,
        'user-agent': testUA,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should reject same password as current', async () => {
    // First login with new password to get fresh token
    const loginUA = `ChangePasswordSame/${Date.now()}`;
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: testEmail, password: 'NewSecurePass123!' },
      headers: { 'user-agent': loginUA },
    });
    const freshToken = loginRes.json().access_token;

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/change-password',
      payload: {
        current_password: 'NewSecurePass123!',
        new_password: 'NewSecurePass123!',
      },
      headers: {
        authorization: `Bearer ${freshToken}`,
        'user-agent': testUA,
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
