import { FastifyInstance } from 'fastify';
import {
  setupTestDb,
  cleanDb,
  closeDb,
  createTestApp,
  prisma,
} from '../helpers/build-app';

let app: FastifyInstance;

beforeAll(async () => {
  await setupTestDb();
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

beforeEach(async () => {
  await cleanDb();
});

const validRegistration = {
  name: 'Fatima Ahmed',
  email: 'fatima@example.com',
  password: 'SecurePass1',
};

async function registerAndGetToken(): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: validRegistration,
  });
  return response.json().accessToken;
}

describe('GET /api/profile', () => {
  it('should return the authenticated parent profile', async () => {
    const accessToken = await registerAndGetToken();

    const response = await app.inject({
      method: 'GET',
      url: '/api/profile',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.name).toBe('Fatima Ahmed');
    expect(body.email).toBe('fatima@example.com');
    expect(body.createdAt).toBeDefined();
    expect(body.childCount).toBe(0);
  });

  it('should include child count', async () => {
    const accessToken = await registerAndGetToken();

    // Create a child
    await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: 'Ahmad',
        dateOfBirth: '2018-06-15',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/profile',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().childCount).toBe(1);
  });

  it('should not expose password hash', async () => {
    const accessToken = await registerAndGetToken();

    const response = await app.inject({
      method: 'GET',
      url: '/api/profile',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.passwordHash).toBeUndefined();
    expect(body.password_hash).toBeUndefined();
    expect(body.password).toBeUndefined();
  });

  it('should reject unauthenticated request with 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/profile',
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('PUT /api/profile', () => {
  it('should update parent name', async () => {
    const accessToken = await registerAndGetToken();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Fatima Al-Ahmed' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.name).toBe('Fatima Al-Ahmed');
    expect(body.email).toBe('fatima@example.com');
  });

  it('should update parent email', async () => {
    const accessToken = await registerAndGetToken();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: 'fatima.new@example.com' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().email).toBe('fatima.new@example.com');
  });

  it('should update both name and email', async () => {
    const accessToken = await registerAndGetToken();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Fatima Al-Ahmed', email: 'fatima.new@example.com' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.name).toBe('Fatima Al-Ahmed');
    expect(body.email).toBe('fatima.new@example.com');
  });

  it('should reject duplicate email with 409', async () => {
    const accessToken = await registerAndGetToken();

    // Register another user
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Other User',
        email: 'other@example.com',
        password: 'SecurePass1',
      },
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: 'other@example.com' },
    });

    expect(response.statusCode).toBe(409);
  });

  it('should reject invalid email format with 422', async () => {
    const accessToken = await registerAndGetToken();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: 'not-an-email' },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject empty name with 422', async () => {
    const accessToken = await registerAndGetToken();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: '' },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject unauthenticated request with 401', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      payload: { name: 'Test' },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('PUT /api/profile/password', () => {
  it('should change password with valid current password', async () => {
    const accessToken = await registerAndGetToken();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/profile/password',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        currentPassword: 'SecurePass1',
        newPassword: 'NewSecure2',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().message).toBe('Password updated successfully');
  });

  it('should allow login with new password after change', async () => {
    const accessToken = await registerAndGetToken();

    await app.inject({
      method: 'PUT',
      url: '/api/profile/password',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        currentPassword: 'SecurePass1',
        newPassword: 'NewSecure2',
      },
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'fatima@example.com',
        password: 'NewSecure2',
      },
    });

    expect(loginResponse.statusCode).toBe(200);
  });

  it('should reject login with old password after change', async () => {
    const accessToken = await registerAndGetToken();

    await app.inject({
      method: 'PUT',
      url: '/api/profile/password',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        currentPassword: 'SecurePass1',
        newPassword: 'NewSecure2',
      },
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'fatima@example.com',
        password: 'SecurePass1',
      },
    });

    expect(loginResponse.statusCode).toBe(401);
  });

  it('should reject wrong current password with 401', async () => {
    const accessToken = await registerAndGetToken();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/profile/password',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        currentPassword: 'WrongPass1',
        newPassword: 'NewSecure2',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject weak new password with 422', async () => {
    const accessToken = await registerAndGetToken();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/profile/password',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        currentPassword: 'SecurePass1',
        newPassword: 'weak',
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject missing currentPassword with 422', async () => {
    const accessToken = await registerAndGetToken();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/profile/password',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        newPassword: 'NewSecure2',
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject missing newPassword with 422', async () => {
    const accessToken = await registerAndGetToken();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/profile/password',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        currentPassword: 'SecurePass1',
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it('should reject unauthenticated request with 401', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/profile/password',
      payload: {
        currentPassword: 'SecurePass1',
        newPassword: 'NewSecure2',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
