/**
 * Test environment bootstrap. Imported FIRST (before any module that touches
 * the Prisma client) so every test run targets the dedicated `studyflow_test`
 * database — never the dev DB. NFR-002 / Constitution Art. III: tests run
 * against REAL Postgres, no mocks.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres@localhost:5432/studyflow_test';
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || 'test-session-secret-at-least-32-chars-long-xx';
process.env.ALLOWED_ORIGINS =
  process.env.ALLOWED_ORIGINS || 'http://localhost:3122';
