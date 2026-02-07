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

afterAll(async () => {
  await app.close();
  await closeDb();
});

beforeEach(async () => {
  await cleanDb();
});

describe('GET /api/health', () => {
  it('should return 200 with status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
  });

  it('should include database connection status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const body = response.json();
    expect(body.database).toBe('connected');
  });

  it('should include version number', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const body = response.json();
    expect(body.version).toBe('1.0.0');
  });

  it('should include a valid ISO timestamp', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const body = response.json();
    expect(body.timestamp).toBeDefined();
    const timestamp = new Date(body.timestamp);
    expect(timestamp.toISOString()).toBe(body.timestamp);
  });

  it('should return JSON content type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});
