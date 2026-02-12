import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../setup';

describe('Health Route', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should return 200 with healthy status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.status).toBe('healthy');
    expect(body.timestamp).toBeDefined();
    expect(typeof body.timestamp).toBe('string');
    // Verify timestamp is a valid ISO string
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});
