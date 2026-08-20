import type { Config } from 'jest';

/**
 * Coverage thresholds are the Constitution Article XIII floor (80% lines and
 * statements). They ratchet up, never down.
 *
 * NFR-018 requires 100% BRANCH coverage on the Transition Coordinator. That is
 * enforced as a per-path override the moment `src/engine/` exists — add it here
 * in the same PR that adds the coordinator.
 */
const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30_000,
  verbose: true,
  // The engine's tests run real transactions against one database.
  maxWorkers: 1,
  transform: { '^.+\\.ts$': '@swc/jest' },
  collectCoverageFrom: [
    'src/**/*.ts',
    'scripts/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/fixtures/'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

export default config;
