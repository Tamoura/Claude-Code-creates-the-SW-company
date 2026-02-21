import { execSync } from 'child_process';

export default async function globalSetup(): Promise<void> {
  // Set test environment
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

  // Push schema to test database (reset)
  try {
    execSync('npx prisma db push --force-reset', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
      cwd: __dirname + '/..',
      stdio: 'pipe',
    });
  } catch (error) {
    console.error(
      'Failed to setup test database. Ensure PostgreSQL is running.'
    );
    throw error;
  }
}
