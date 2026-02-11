import { FastifyInstance } from 'fastify';
import {
  setupTestDb,
  cleanDb,
  closeDb,
  createTestApp,
} from '../helpers/build-app';

let app: FastifyInstance;

beforeAll(async () => {
  await setupTestDb();
  app = await createTestApp();
});

afterEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

describe('GET /api/v1/health', () => {
  it('returns 200 with status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
  });

  it('returns version field', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    const body = JSON.parse(response.body);
    expect(body.version).toBe('0.1.0');
  });

  it('returns uptime as a number', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    const body = JSON.parse(response.body);
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('returns database connected status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    const body = JSON.parse(response.body);
    expect(body.database).toBe('connected');
  });

  it('returns correct content-type header', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('Error handling', () => {
  it('returns 404 for unknown routes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/nonexistent',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns consistent error format', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/nonexistent',
    });

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
    expect(body.error).toHaveProperty('statusCode');
  });
});

describe('CORS', () => {
  it('returns CORS headers for allowed origins', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/health',
      headers: {
        origin: 'http://localhost:3110',
        'access-control-request-method': 'GET',
      },
    });

    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:3110'
    );
  });
});
