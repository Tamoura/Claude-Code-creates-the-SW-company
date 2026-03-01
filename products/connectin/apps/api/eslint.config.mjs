import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';
import noSecrets from 'eslint-plugin-no-secrets';

// ConnectSW standard: extends @connectsw/eslint-config/backend rules via flat config.
// Security rules mirror packages/eslint-config/backend.js for flat config compatibility.
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  security.configs['recommended-legacy'],
  {
    plugins: {
      'no-secrets': noSecrets,
    },
    rules: {
      // ── Clean Code: Complexity ─────────────────────────────────────────────
      'complexity': ['error', 10],
      'max-depth': ['error', 3],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['error', 2],
      'max-params': ['error', 4],

      // ── Clean Code: Style ──────────────────────────────────────────────────
      'no-console': 'error',
      'no-debugger': 'error',

      // ── TypeScript ─────────────────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // ── Security: OWASP ────────────────────────────────────────────────────
      'security/detect-eval-with-expression': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-child-process': 'warn',

      // ── Security: Backend-specific ─────────────────────────────────────────
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',

      // ── Secrets Detection ──────────────────────────────────────────────────
      'no-secrets/no-secrets': ['error', { tolerance: 4.2 }],
    },
  },
  {
    // Test file relaxations
    files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'no-console': 'off',
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'max-params': 'off',
      'no-secrets/no-secrets': 'off',
      'security/detect-object-injection': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  },
);
