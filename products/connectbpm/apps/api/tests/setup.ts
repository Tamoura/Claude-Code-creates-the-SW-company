/**
 * Jest setup — runs before every test file.
 *
 * CONVENTION (Constitution Article III, addendum "Testing"):
 *   Tests run against a REAL PostgreSQL and a REAL Redis. There are no mocks
 *   of the database, the cache, or the clock's storage. `docker compose up -d
 *   db redis` (or the CI service containers) must be running.
 *
 * TENANCY (ADR-004 §3, NFR-008):
 *   The suite connects as `connectbpm_app` — NOSUPERUSER, NOBYPASSRLS — and NOT
 *   as `postgres`. Row-level security is invisible to a privileged role, so a
 *   suite that ran as the superuser would report a passing isolation gate while
 *   the isolation did nothing. `provision-db-roles.ts` creates the roles;
 *   `rls-enforcement.test.ts` asserts the posture before it asserts anything
 *   else, so pointing DATABASE_URL back at a superuser fails the build.
 */
process.env.NODE_ENV = 'test';

const PG_HOST = process.env.PGHOST_TEST ?? 'localhost:5438';

/** The application role. Everything the API does runs through this one. */
process.env.DATABASE_URL ??= `postgresql://connectbpm_app:connectbpm_app_dev@${PG_HOST}/connectbpm_test`;
/** Owns the tables. Used only to prove FORCE RLS binds the OWNER too. */
process.env.DATABASE_URL_MIGRATOR ??= `postgresql://connectbpm_migrator:connectbpm_migrator_dev@${PG_HOST}/connectbpm_test`;
/** Superuser. Used only to prove that RLS is what filters, by removing it. */
process.env.ADMIN_DATABASE_URL ??= `postgresql://postgres:postgres@${PG_HOST}/connectbpm_test`;

process.env.REDIS_URL ??= 'redis://localhost:6388';
process.env.JWT_SECRET ??= 'test-jwt-secret-at-least-32-characters-long!!';
process.env.JWT_REFRESH_SECRET ??=
  'test-refresh-secret-at-least-32-characters-long!';
process.env.LOG_LEVEL ??= 'error';
