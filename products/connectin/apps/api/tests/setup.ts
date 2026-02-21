// Test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/connectin_test';
process.env.JWT_SECRET =
  'test-jwt-secret-at-least-32-characters-long-for-testing';
process.env.JWT_REFRESH_SECRET =
  'test-refresh-secret-at-least-32-chars-long-for-testing';
process.env.FRONTEND_URL = 'http://localhost:3111';
process.env.API_URL = 'http://localhost:5007';
