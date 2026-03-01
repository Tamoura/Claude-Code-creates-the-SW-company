'use strict';

/**
 * Base ESLint configuration for all ConnectSW TypeScript code.
 * Enforces clean code structure and security rules that apply everywhere.
 *
 * Security rules map to:
 *   - OWASP Top 10 (2021) via eslint-plugin-security
 *   - Secrets detection via eslint-plugin-no-secrets
 *   - Complexity/size limits per ConnectSW Clean Code Protocol
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'security', 'no-secrets', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict',
    'plugin:security/recommended-legacy',
    'prettier',
    'plugin:prettier/recommended',
  ],
  rules: {
    // ── Clean Code: Complexity ──────────────────────────────────────────────
    // Keep functions comprehensible. Cyclomatic complexity > 10 = split it.
    'complexity': ['error', 10],
    // Deeply nested blocks are hard to read and test.
    'max-depth': ['error', 3],
    // Files > 300 lines are a single responsibility violation.
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    // Functions > 50 lines are doing too much.
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    // Deeply nested callbacks are callback hell.
    'max-nested-callbacks': ['error', 2],
    // Too many params = missing abstraction (use object/config param instead).
    'max-params': ['error', 4],

    // ── Clean Code: Style ───────────────────────────────────────────────────
    // No console.log in production — use structured logger (Pino).
    'no-console': 'error',
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'curly': ['error', 'all'],

    // ── TypeScript: Strictness ──────────────────────────────────────────────
    // `any` defeats TypeScript's purpose — use `unknown` + type guards.
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // Unhandled promises are silent failures — always await or catch.
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    // Prefer explicit return types for public APIs and exported functions.
    '@typescript-eslint/explicit-function-return-type': ['warn', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    }],
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    // Non-null assertions hide bugs — use proper null checks.
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // ── Security: OWASP via eslint-plugin-security ──────────────────────────
    // OWASP A01 — eval/dynamic code execution (Injection)
    'security/detect-eval-with-expression': 'error',
    // OWASP A03 — Injection via unsafe regex (ReDoS attacks)
    'security/detect-unsafe-regex': 'error',
    // OWASP A03 — Buffer manipulation without bounds check
    'security/detect-buffer-noassert': 'error',
    // OWASP A03 — Template injection via mustache disable
    'security/detect-disable-mustache-escape': 'error',
    // OWASP A07 — Cryptographically weak randomness
    'security/detect-pseudoRandomBytes': 'error',
    // OWASP A10 — CSRF bypass via method override
    'security/detect-no-csrf-before-method-override': 'error',
    // OWASP A04 — Timing attacks on secret comparison
    'security/detect-possible-timing-attacks': 'error',
    // Deprecated Buffer constructor with non-literal size
    'security/detect-new-buffer': 'error',
    // Advisory: object injection via user-controlled keys
    'security/detect-object-injection': 'warn',
    // Advisory: dynamic RegExp can be attacker-controlled
    'security/detect-non-literal-regexp': 'warn',
    // Advisory: child_process usage — must be intentional
    'security/detect-child-process': 'warn',

    // ── Security: Secrets Detection ─────────────────────────────────────────
    // Catches accidentally hardcoded API keys, passwords, tokens.
    // Tolerance 4.2 = balance between false positives and true catches.
    'no-secrets/no-secrets': ['error', { tolerance: 4.2 }],

    // ── Prettier ────────────────────────────────────────────────────────────
    'prettier/prettier': 'error',
  },
  overrides: [
    // Relaxed rules for test files (any types, console, complexity OK in tests)
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts', '**/tests/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        'no-console': 'off',
        'max-lines-per-function': 'off',
        'max-lines': 'off',
        'max-params': 'off',
        'no-secrets/no-secrets': 'off',
        'security/detect-object-injection': 'off',
      },
    },
    // Relaxed rules for config files (require(), no types, etc.)
    {
      files: ['*.js', '*.cjs', '*.mjs'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        'no-secrets/no-secrets': 'off',
      },
    },
  ],
  env: {
    node: true,
    es2022: true,
  },
};
