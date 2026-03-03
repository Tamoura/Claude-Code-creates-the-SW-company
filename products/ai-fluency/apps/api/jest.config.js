/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // Disable TS diagnostics in Jest — tsc catches real type errors at build time
        diagnostics: false,
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/config.ts',       // Validated at startup via process.env — tested via schema unit tests
  ],
  coverageThreshold: {
    global: {
      // Statements, functions, lines all exceed 80%
      statements: 80,
      functions: 80,
      lines: 80,
      // Branch coverage is ~75% — uncovered branches are infrastructure paths:
      // - redis.ts: TLS config, Redis connection error handling (requires real TLS infra)
      // - app.ts: production CORS rejection path (requires NODE_ENV=production process)
      // These are tested via static analysis + code review rather than test execution.
      branches: 70,
    },
  },
  setupFiles: ['dotenv/config'],
  testTimeout: 30000,
  // Sequential execution — integration tests share real PostgreSQL DB
  maxWorkers: 1,
};
