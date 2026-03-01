'use strict';

/**
 * Backend ESLint configuration for ConnectSW Fastify/Node.js APIs.
 * Extends base config with Node.js-specific security and best practices.
 *
 * Additional enforcement vs base:
 *   - Blocks eval() and Function() — prevents code injection (OWASP A03)
 *   - Node.js best practices via plugin:n/recommended
 *   - Enforces structured logging (no console — must use Pino)
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [require.resolve('./base.js')],
  plugins: ['n'],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // ── Node.js Security ────────────────────────────────────────────────────
    // Prevent code injection via eval — there is no valid use case in a Fastify API.
    'no-eval': 'error',
    // Prevent Function constructor as eval equivalent.
    'no-new-func': 'error',
    // Block implied eval in setTimeout/setInterval string arguments.
    'no-implied-eval': 'error',

    // ── Logging ─────────────────────────────────────────────────────────────
    // Enforce structured Pino logging — never raw console in API code.
    // console is already 'error' in base; this is a reminder comment.
    'no-console': 'error',

    // ── Promises ─────────────────────────────────────────────────────────────
    // All async calls in Fastify must be awaited or explicitly caught.
    '@typescript-eslint/no-floating-promises': 'error',
    'no-return-await': 'error',

    // ── TypeScript strictness for backend ───────────────────────────────────
    // API routes must have explicit return types to prevent untyped responses.
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    }],
  },
  overrides: [
    // Allow require() in migration and seed scripts
    {
      files: ['**/prisma/**/*.ts', '**/scripts/**/*.ts', '**/seeds/**/*.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off',
      },
    },
    // Test files inherit base test relaxations
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts', '**/tests/**/*.ts'],
      rules: {
        'no-console': 'off',
        'no-eval': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
};
