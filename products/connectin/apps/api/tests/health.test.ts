import { getApp, closeApp } from './helpers';

afterAll(async () => {
  await closeApp();
});

describe('Health Check', () => {
  it('GET /health returns status ok when database is connected', async () => {
    const app = await getApp();
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.database).toBe('connected');
    expect(body.data.timestamp).toBeDefined();
    expect(typeof body.data.uptime).toBe('number');
    expect(body.data.uptime).toBeGreaterThanOrEqual(0);
    expect(body.data.version).toBeDefined();
    expect(body.data.redis).toBe('not_configured');
  });
});
