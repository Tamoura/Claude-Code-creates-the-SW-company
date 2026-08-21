/**
 * Root Jest configuration for @connectsw shared packages.
 *
 * This config is used to run unit tests across all packages under
 * packages/ without requiring each package to install its own copy
 * of ts-jest and jest.  Product apps (products/*/apps/) each have
 * their own jest.config.js that is invoked separately.
 *
 * Run all package tests from the repo root:
 *   npx jest --config jest.config.js
 *
 * Run tests for a specific package:
 *   npx jest --config jest.config.js --testPathPattern="packages/auth"
 */

/** @type {import('jest').Config} */
module.exports = {
  // Use ts-jest so we can import TypeScript source files directly
  // without a build step during testing.
  preset: 'ts-jest',

  testEnvironment: 'node',

  // Discover tests only inside packages/__tests__ directories so
  // we do not accidentally pick up tests from product apps.
  roots: ['<rootDir>/packages'],

  testMatch: [
    '**/packages/**/__tests__/**/*.test.ts',
    '**/packages/**/__tests__/**/*.spec.ts',
  ],

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // Suppress type-check errors during test runs.  Real type
        // errors are caught by `tsc` in the build pipeline.
        diagnostics: false,

        tsconfig: {
          // Allow CommonJS interop so ts-jest can resolve ESM-only
          // packages that use "type": "module".
          esModuleInterop: true,
          module: 'CommonJS',
          moduleResolution: 'node',
          strict: false,
          skipLibCheck: true,
          // Allow importing .ts files from other packages without
          // building them first.
          paths: {},
        },
      },
    ],
  },

  // Strip the .js extension from relative imports so ts-jest can
  // resolve them against the .ts source files.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Coverage is collected from source files inside each package,
  // excluding declaration files and barrel re-exports.
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'packages/*/src/**/*.tsx',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/index.ts',
    '!packages/eslint-config/**',
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Keep tests isolated from each other — no shared mutable state.
  clearMocks: true,
  restoreMocks: true,

  // Generous timeout for any test that does I/O (e.g., crypto ops).
  testTimeout: 15000,

  // Verbose output helps CI logs show which test suites pass/fail.
  verbose: true,
};
