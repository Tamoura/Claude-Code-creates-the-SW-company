/**
 * tests/helpers/build-app.ts — Test factory for Fastify instance
 *
 * Creates a real Fastify app connected to the test database (ai_fluency_test).
 * NO mocks — tests use real PostgreSQL and real Redis.
 *
 * PATTERN-011: buildApp() in tests creates real instance with real DB.
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

let _app: FastifyInstance | null = null;

/**
 * Get (or create) the shared Fastify test instance.
 * Reuses the same instance across tests in a test file for performance.
 */
export async function getTestApp(): Promise<FastifyInstance> {
  if (!_app) {
    _app = await buildApp();
    // Wait for Fastify to be ready
    await _app.ready();
  }
  return _app;
}

/**
 * Close the test app (call in afterAll).
 */
export async function closeTestApp(): Promise<void> {
  if (_app) {
    await _app.close();
    _app = null;
  }
}
