import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { setupTestDb, cleanDb, closeDb } from './setup';

let app: FastifyInstance;

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
    expect(body.version).toBe('1.0.0');
    expect(body.database).toBe('connected');
    expect(body.timestamp).toBeDefined();
  });

  it('should include a valid ISO timestamp', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const body = response.json();
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
