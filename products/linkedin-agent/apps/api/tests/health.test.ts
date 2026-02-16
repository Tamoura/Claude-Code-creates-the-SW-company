import { FastifyInstance } from 'fastify';
import {
  buildTestApp,
  cleanDB,
  disconnectTestPrisma,
} from './setup';

describe('Health endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDB();
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestPrisma();
  });

  // --- GET /api/health ---

  it('GET /api/health returns 200 with status "ok"', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
  });

  it('GET /api/health returns database "connected"', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const body = res.json();
    expect(body.database).toBe('connected');
  });

  it('GET /api/health includes service name and version', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const body = res.json();
    expect(body.service).toBe('linkedin-agent-api');
    expect(body.version).toBe('1.0.0');
  });

  it('GET /api/health includes memory and uptime', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const body = res.json();
    expect(body.uptime).toEqual(expect.any(Number));
    expect(body.memory).toBeDefined();
    expect(body.memory.rssBytes).toEqual(expect.any(Number));
  });

  // --- GET /api/health/ready ---

  it('GET /api/health/ready returns 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health/ready',
    });

    expect(res.statusCode).toBe(200);
  });

  it('GET /api/health/ready returns status "ready"', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health/ready',
    });

    const body = res.json();
    expect(body.status).toBe('ready');
    expect(body.database).toBe('connected');
  });
});
