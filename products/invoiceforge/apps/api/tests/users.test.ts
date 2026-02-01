import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { setupTestDb, cleanDb, closeDb, prisma } from './setup';

let app: FastifyInstance;

const validUser = {
  email: 'usertest@example.com',
  password: 'SecurePass123!',
  name: 'Profile Test User',
};

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function registerUser(
  application: FastifyInstance,
  email = validUser.email,
  name = validUser.name
) {
  const res = await application.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { ...validUser, email, name },
  });
  const body = res.json();
  return { token: body.accessToken, userId: body.user.id };
}

beforeAll(async () => {
  await setupTestDb();
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

describe('GET /api/users/me', () => {
  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    await cleanDb();
    const auth = await registerUser(app);
    accessToken = auth.token;
    userId = auth.userId;
  });

  it('should return the user profile', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe(userId);
    expect(body.email).toBe(validUser.email);
    expect(body.name).toBe(validUser.name);
    expect(body.subscriptionTier).toBe('free');
    expect(body.invoiceCountThisMonth).toBe(0);
    expect(body.stripeConnected).toBe(false);
    expect(body.createdAt).toBeDefined();
  });

  it('should not expose password hash', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: authHeader(accessToken),
    });

    const body = response.json();
    expect(body.passwordHash).toBeUndefined();
    expect(body.password_hash).toBeUndefined();
    expect(body.password).toBeUndefined();
  });

  it('should require authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users/me',
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('PUT /api/users/me', () => {
  let accessToken: string;

  beforeEach(async () => {
    await cleanDb();
    const auth = await registerUser(app);
    accessToken = auth.token;
  });

  it('should update name', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/users/me',
      headers: authHeader(accessToken),
      payload: { name: 'Updated Name' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().name).toBe('Updated Name');
  });

  it('should update businessName', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/users/me',
      headers: authHeader(accessToken),
      payload: { businessName: 'My Business LLC' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().businessName).toBe('My Business LLC');
  });

  it('should update both name and businessName', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/users/me',
      headers: authHeader(accessToken),
      payload: {
        name: 'New Name',
        businessName: 'New Biz',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.name).toBe('New Name');
    expect(body.businessName).toBe('New Biz');
  });

  it('should reject empty name', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/users/me',
      headers: authHeader(accessToken),
      payload: { name: '' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should require authentication', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/users/me',
      payload: { name: 'Nope' },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('GET /api/users/me/subscription', () => {
  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    await cleanDb();
    const auth = await registerUser(app);
    accessToken = auth.token;
    userId = auth.userId;
  });

  it('should return free tier subscription info', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users/me/subscription',
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.tier).toBe('free');
    expect(body.invoicesUsed).toBe(0);
    expect(body.invoicesRemaining).toBe(5);
    expect(body.resetDate).toBeDefined();
  });

  it('should show correct count after creating invoices', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { invoiceCountThisMonth: 3 },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/users/me/subscription',
      headers: authHeader(accessToken),
    });

    const body = response.json();
    expect(body.invoicesUsed).toBe(3);
    expect(body.invoicesRemaining).toBe(2);
  });

  it('should require authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users/me/subscription',
    });

    expect(response.statusCode).toBe(401);
  });
});
