import type { Config } from 'jest';

/**
 * Integration tests run against a real PostgreSQL database — Article III
 * forbids mocking the database. Start it with `docker compose up -d` from the
 * product root before running the suite.
 */
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/db.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  testTimeout: 20000,
};

export default config;
