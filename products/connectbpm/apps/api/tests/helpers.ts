/**
 * Shared test helpers.
 *
 * CONVENTION (binding for all downstream agents):
 *   Build the app with `buildTestApp()`. It is the same `buildApp()` the server
 *   uses, so there is no second wiring path that can drift.
 *
 *   Tenant fixtures: every isolation test provisions TWO tenants and asserts
 *   that A cannot see B (AC-049/AC-050). A single-tenant fixture cannot detect
 *   the bug class this product cannot survive.
 */
import type { FastifyInstance } from 'fastify';
import { buildApp, type BuildAppOptions } from '../src/app';
import { resetConfigForTests } from '../src/config';

export async function buildTestApp(
  options: BuildAppOptions = {}
): Promise<FastifyInstance> {
  resetConfigForTests();
  const app = await buildApp(options);
  await app.ready();
  return app;
}
