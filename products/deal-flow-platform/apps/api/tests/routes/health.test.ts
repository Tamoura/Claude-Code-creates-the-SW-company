import { FastifyInstance } from 'fastify';
import { createTestApp } from '../helpers/test-utils';

describe('Health Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('returns healthy status when database is connected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('healthy');
      expect(body).toHaveProperty('timestamp');
    });
  });
});
