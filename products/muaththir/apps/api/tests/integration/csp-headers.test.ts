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

describe('Content-Security-Policy headers', () => {
  it('should include Content-Security-Policy header on responses', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    const cspHeader = response.headers['content-security-policy'];
    expect(cspHeader).toBeDefined();
  });

  it('should set default-src to self', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const csp = response.headers['content-security-policy'] as string;
    expect(csp).toContain("default-src 'self'");
  });

  it('should allow self for script-src', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const csp = response.headers['content-security-policy'] as string;
    expect(csp).toContain("script-src 'self'");
  });

  it('should allow self and unsafe-inline for style-src (Tailwind)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const csp = response.headers['content-security-policy'] as string;
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it('should allow self for img-src', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const csp = response.headers['content-security-policy'] as string;
    expect(csp).toContain("img-src 'self'");
  });

  it('should allow self for font-src', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const csp = response.headers['content-security-policy'] as string;
    expect(csp).toContain("font-src 'self'");
  });

  it('should allow self for connect-src', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const csp = response.headers['content-security-policy'] as string;
    expect(csp).toContain("connect-src 'self'");
  });

  it('should block object-src', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const csp = response.headers['content-security-policy'] as string;
    expect(csp).toContain("object-src 'none'");
  });

  it('should block frame-ancestors', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const csp = response.headers['content-security-policy'] as string;
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
