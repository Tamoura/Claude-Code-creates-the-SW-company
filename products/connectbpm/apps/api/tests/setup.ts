/**
 * Jest setup — runs before every test file.
 *
 * CONVENTION (Constitution Article III, addendum "Testing"):
 *   Tests run against a REAL PostgreSQL and a REAL Redis. There are no mocks
 *   of the database, the cache, or the clock's storage. `docker compose up -d
 *   db redis` (or the CI service containers) must be running.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5438/connectbpm_test';
process.env.REDIS_URL ??= 'redis://localhost:6388';
process.env.JWT_SECRET ??= 'test-jwt-secret-at-least-32-characters-long!!';
process.env.JWT_REFRESH_SECRET ??=
  'test-refresh-secret-at-least-32-characters-long!';
process.env.LOG_LEVEL ??= 'error';
