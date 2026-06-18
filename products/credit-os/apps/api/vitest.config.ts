/**
 * Vitest configuration — Composable Credit OS API.
 *
 * Two projects (Article III — real dependencies, no mocks):
 *  - `unit`        — fast, pure-logic tests under tests/unit/.
 *  - `integration` — exercise the real Fastify app + a real PostgreSQL test
 *                    database (TEST_DATABASE_URL → credit_os_test).
 *
 * Coverage threshold is 80% (Constitution Article III). The Phase 0 scaffold
 * has no business logic to cover yet, so the threshold gate is wired but
 * `tests/setup-integration.ts` points DATABASE_URL at the test DB.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['tests/setup-integration.ts'],
          hookTimeout: 30_000,
          testTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/**/*.d.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
