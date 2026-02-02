import type { Config } from '@jest/types';

/**
 * Jest Configuration for Integration Tests
 *
 * This configuration is specifically for full-stack integration tests
 * that run against live services (API and frontend).
 *
 * Prerequisites:
 * - Backend API must be running on port 5001
 * - Frontend web app must be running on port 3104
 * - Database must be available and seeded
 *
 * Usage:
 * - Run tests: npx jest --config e2e/integration/jest.config.ts
 * - Run with watch: npx jest --config e2e/integration/jest.config.ts --watch
 * - Run with coverage: npx jest --config e2e/integration/jest.config.ts --coverage
 */

const config: Config.InitialOptions = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',

  // Test environment - Node.js for integration tests
  testEnvironment: 'node',

  // Root directory for tests
  rootDir: '.',

  // Test match patterns - only run tests in this directory
  testMatch: ['<rootDir>/**/*.test.ts'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform TypeScript files
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: false,
          skipLibCheck: true,
        },
      },
    ],
  },

  // Timeout for integration tests (30 seconds)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Collect coverage from test files
  collectCoverageFrom: ['**/*.test.ts'],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Bail on first test failure (optional - set to false to run all tests)
  bail: false,

  // Display individual test results
  displayName: {
    name: 'Integration Tests',
    color: 'blue',
  },

  // Setup files to run before tests
  // setupFilesAfterEnv: ['<rootDir>/setup.ts'],

  // Global setup/teardown (if needed)
  // globalSetup: '<rootDir>/global-setup.ts',
  // globalTeardown: '<rootDir>/global-teardown.ts',

  // Max workers for parallel execution
  maxWorkers: 1, // Run sequentially for integration tests to avoid conflicts

  // Detect open handles (helps find issues with async operations)
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: true,
};

export default config;
