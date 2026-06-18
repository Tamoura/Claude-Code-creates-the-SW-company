/**
 * Integration test setup.
 *
 * Points the process at the real PostgreSQL *test* database (credit_os_test)
 * so integration tests never touch the dev database. Runs before every
 * integration test file (Vitest `setupFiles`).
 */
const testDbUrl = process.env.TEST_DATABASE_URL;
if (testDbUrl) {
  process.env.DATABASE_URL = testDbUrl;
}
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent';
