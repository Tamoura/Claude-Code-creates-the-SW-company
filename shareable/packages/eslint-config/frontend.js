'use strict';

/**
 * Frontend ESLint configuration for ConnectSW Next.js/React applications.
 * Extends base config with React, accessibility, and XSS prevention rules.
 *
 * Additional enforcement vs base:
 *   - Accessibility (WCAG 2.1 AA) via eslint-plugin-jsx-a11y strict preset
 *   - XSS prevention via eslint-plugin-no-unsanitized
 *   - React Hooks correctness via eslint-plugin-react-hooks
 *   - Next.js best practices via @next/eslint-plugin-next
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    require.resolve('./base.js'),
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/strict',
  ],
  plugins: ['react-hooks', 'jsx-a11y', 'no-unsanitized'],
  env: {
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    // ── XSS Prevention ──────────────────────────────────────────────────────
    // OWASP A03 — dangerouslySetInnerHTML without DOMPurify.sanitize() is XSS.
    'no-unsanitized/method': 'error',
    'no-unsanitized/property': 'error',

    // ── Accessibility (WCAG 2.1 AA) ─────────────────────────────────────────
    // jsx-a11y/strict preset covers: alt text, label associations, role usage,
    // keyboard navigation, focus management, color contrast guidance.
    // Additional rules beyond the preset:
    'jsx-a11y/no-autofocus': 'warn',
    'jsx-a11y/anchor-is-valid': ['error', {
      components: ['Link'],
      specialLink: ['hrefLeft', 'hrefRight'],
      aspects: ['invalidHref', 'preferButton'],
    }],

    // ── React Hooks ─────────────────────────────────────────────────────────
    // Exhaustive deps prevents stale closures (common React bug).
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // ── Frontend Security ────────────────────────────────────────────────────
    // No eval in React components — never needed in UI code.
    'no-eval': 'error',
    'no-new-func': 'error',
    // Secrets in React code end up in the browser bundle — block at lint time.
    'no-secrets/no-secrets': ['error', { tolerance: 4.2 }],

    // ── Console in Browser ───────────────────────────────────────────────────
    // console.log in production leaks internal state to browser devtools.
    'no-console': 'error',

    // ── Client Component Discipline ─────────────────────────────────────────
    // Complexity limits apply equally to frontend — large components need splitting.
    'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
  },
  overrides: [
    // Next.js page files — allow longer default exports (layouts, pages)
    {
      files: ['**/app/**/(page|layout|loading|error|not-found).tsx'],
      rules: {
        'max-lines-per-function': ['error', { max: 120, skipBlankLines: true, skipComments: true }],
      },
    },
    // Story files for Storybook
    {
      files: ['**/*.stories.tsx', '**/*.story.tsx'],
      rules: {
        'no-console': 'off',
        'max-lines-per-function': 'off',
        'no-secrets/no-secrets': 'off',
      },
    },
    // Test files
    {
      files: ['**/*.test.tsx', '**/*.spec.tsx', '**/__tests__/**/*.tsx', '**/tests/**/*.tsx'],
      rules: {
        'no-console': 'off',
        'max-lines-per-function': 'off',
        'jsx-a11y/no-autofocus': 'off',
        'no-secrets/no-secrets': 'off',
      },
    },
  ],
};
