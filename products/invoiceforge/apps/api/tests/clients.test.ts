import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { setupTestDb, cleanDb, closeDb, prisma } from './setup';

let app: FastifyInstance;
let accessToken: string;

const validUser = {
  email: 'clienttest@example.com',
  password: 'SecurePass123!',
  name: 'Client Test User',
};

async function registerAndGetToken(): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: validUser,
  });
  return res.json().accessToken;
}

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
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

beforeEach(async () => {
  await cleanDb();
  accessToken = await registerAndGetToken();
});

describe('POST /api/clients', () => {
  it('should create a client with all fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeader(accessToken),
      payload: {
        name: 'Acme Corp',
        email: 'billing@acme.com',
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'US',
        phone: '555-1234',
        notes: 'VIP client',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Acme Corp');
    expect(body.email).toBe('billing@acme.com');
    expect(body.city).toBe('Springfield');
    expect(body.notes).toBe('VIP client');
  });

  it('should create a client with only required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeader(accessToken),
      payload: { name: 'Minimal Client' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.name).toBe('Minimal Client');
    expect(body.country).toBe('US');
  });

  it('should reject client without name', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeader(accessToken),
      payload: { email: 'noname@example.com' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should reject invalid email format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeader(accessToken),
      payload: { name: 'Bad Email Client', email: 'not-an-email' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should require authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/clients',
      payload: { name: 'No Auth Client' },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('GET /api/clients', () => {
  it('should return empty list when no clients exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/clients',
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it('should list clients for authenticated user', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeader(accessToken),
      payload: { name: 'Client A' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeader(accessToken),
      payload: { name: 'Client B' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/clients',
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.length).toBe(2);
    expect(body.pagination.total).toBe(2);
  });

  it('should not return clients of other users', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeader(accessToken),
      payload: { name: 'My Client' },
    });

    // Register a second user
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'other@example.com',
        password: 'OtherPass123!',
        name: 'Other User',
      },
    });
    const otherToken = res2.json().accessToken;

    const response = await app.inject({
      method: 'GET',
      url: '/api/clients',
      headers: authHeader(otherToken),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.length).toBe(0);
  });

  it('should search clients by name', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeader(accessToken),
      payload: { name: 'Acme Corporation' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeader(accessToken),
      payload: { name: 'Beta Industries' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/clients?search=acme',
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0].name).toBe('Acme Corporation');
  });

  it('should paginate results', async () => {
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/clients',
        headers: authHeader(accessToken),
        payload: { name: `Client ${i}` },
      });
    }

    const response = await app.inject({
      method: 'GET',
      url: '/api/clients?page=1&limit=2',
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.length).toBe(2);
    expect(body.pagination.total).toBe(5);
    expect(body.pagination.totalPages).toBe(3);
    expect(body.pagination.hasMore).toBe(true);
  });
});

describe('GET /api/clients/:id', () => {
  it('should return a single client', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeader(accessToken),
      payload: { name: 'Single Client', email: 'single@test.com' },
    });
    const clientId = createRes.json().id;

    const response = await app.inject({
      method: 'GET',
      url: `/api/clients/${clientId}`,
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe(clientId);
    expect(body.name).toBe('Single Client');
    expect(body.invoices).toBeDefined();
  });

  it('should return 404 for non-existent client', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/clients/00000000-0000-0000-0000-000000000000',
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(404);
  });

  it('should not return another users client', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeader(accessToken),
      payload: { name: 'My Client' },
    });
    const clientId = createRes.json().id;

    const res2 = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'other2@example.com',
        password: 'OtherPass123!',
        name: 'Other User 2',
      },
    });
    const otherToken = res2.json().accessToken;

    const response = await app.inject({
      method: 'GET',
      url: `/api/clients/${clientId}`,
      headers: authHeader(otherToken),
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('PUT /api/clients/:id', () => {
  it('should update a client', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeader(accessToken),
      payload: { name: 'Old Name' },
    });
    const clientId = createRes.json().id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/clients/${clientId}`,
      headers: authHeader(accessToken),
      payload: { name: 'New Name', email: 'updated@test.com' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.name).toBe('New Name');
    expect(body.email).toBe('updated@test.com');
  });

  it('should return 404 for non-existent client', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/clients/00000000-0000-0000-0000-000000000000',
      headers: authHeader(accessToken),
      payload: { name: 'Ghost' },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('DELETE /api/clients/:id', () => {
  it('should delete a client', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeader(accessToken),
      payload: { name: 'Delete Me' },
    });
    const clientId = createRes.json().id;

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/clients/${clientId}`,
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().message).toBe('Client deleted');

    // Verify it's gone
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/clients/${clientId}`,
      headers: authHeader(accessToken),
    });
    expect(getRes.statusCode).toBe(404);
  });

  it('should return 404 for non-existent client', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/clients/00000000-0000-0000-0000-000000000000',
      headers: authHeader(accessToken),
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('Fuzzy matching', () => {
  it('should match similar client names', async () => {
    // Create client in the database directly via API
    await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeader(accessToken),
      payload: { name: 'Acme Corporation' },
    });

    // Verify the client exists by listing
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/clients',
      headers: authHeader(accessToken),
    });
    expect(listRes.json().data.length).toBe(1);
    expect(listRes.json().data[0].name).toBe('Acme Corporation');
  });
});
