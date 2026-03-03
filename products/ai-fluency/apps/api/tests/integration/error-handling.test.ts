/**
 * tests/integration/error-handling.test.ts — Error handling integration tests
 *
 * Tests the global error handler and RFC 7807 response format across all error paths.
 *
 * [BACKEND-01] Error formatting and handling tests
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { AppError } from '../../src/utils/errors';

describe('[BACKEND-01] Global Error Handler', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();

    // Register a test route that throws various error types
    app.get('/test/app-error', async () => {
      throw new AppError('test-error', 422, 'Test application error');
    });

    app.get('/test/unexpected-error', async () => {
      throw new Error('Unexpected internal error');
    });

    app.post(
      '/test/json-body',
      {
        schema: {
          body: {
            type: 'object',
            required: ['name'],
            properties: { name: { type: 'string' } },
          },
        },
      },
      async (request) => {
        return { received: (request.body as { name: string }).name };
      }
    );

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  test('[BACKEND-01] AppError produces RFC 7807 response with correct status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/app-error',
    });

    expect(response.statusCode).toBe(422);
    const body = response.json();
    expect(body.type).toBe('https://api.ai-fluency.connectsw.com/errors/test-error');
    expect(body.title).toBe('test-error');
    expect(body.status).toBe(422);
    expect(body.detail).toBe('Test application error');
  });

  test('[BACKEND-01] AppError response includes instance (correlation ID)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/app-error',
    });

    const body = response.json();
    expect(body.instance).toBeDefined();
  });

  test('[BACKEND-01] unexpected Error produces 500 RFC 7807 response', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/unexpected-error',
    });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.type).toBe('https://api.ai-fluency.connectsw.com/errors/internal-error');
    expect(body.status).toBe(500);
    expect(body.detail).toBeDefined();
  });

  test('[BACKEND-01] Fastify schema validation error produces 400 RFC 7807', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test/json-body',
      payload: { wrongField: 'value' }, // Missing required 'name'
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.type).toContain('https://api.ai-fluency.connectsw.com/errors/');
    expect(body.status).toBe(400);
    expect(body.detail).toBeDefined();
  });

  test('[BACKEND-01] 404 not found produces RFC 7807 response', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/this-path-does-not-exist',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.type).toBe('https://api.ai-fluency.connectsw.com/errors/not-found');
    expect(body.status).toBe(404);
  });

  test('[BACKEND-01] RFC 7807 type field is always a URL', async () => {
    const paths = [
      '/this-does-not-exist',
      '/test/app-error',
      '/test/unexpected-error',
    ];

    for (const path of paths) {
      const response = await app.inject({ method: 'GET', url: path });
      const body = response.json();
      expect(body.type).toMatch(/^https:\/\//);
    }
  });
});

describe('[BACKEND-01] buildProblemDetails utility', () => {
  test('[BACKEND-01] buildProblemDetails produces correct RFC 7807 shape', () => {
    const { buildProblemDetails } = require('../../src/utils/errors');
    const details = buildProblemDetails('validation-error', 400, 'Field is required', 'req-001');

    expect(details.type).toBe(
      'https://api.ai-fluency.connectsw.com/errors/validation-error'
    );
    expect(details.title).toBe('validation-error');
    expect(details.status).toBe(400);
    expect(details.detail).toBe('Field is required');
    expect(details.instance).toBe('req-001');
  });

  test('[BACKEND-01] buildProblemDetails without instance omits field', () => {
    const { buildProblemDetails } = require('../../src/utils/errors');
    const details = buildProblemDetails('not-found', 404, 'Resource not found');

    expect(details).not.toHaveProperty('instance');
  });
});
