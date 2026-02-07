import type { Config } from 'jest';

/**
 * Jest configuration for performance/benchmark tests.
 *
 * Runs separately from integration tests to avoid
 * database state interference. Use: npm run test:perf
 */
const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/performance'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
        diagnostics: false,
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  testTimeout: 60000,
};

export default config;
