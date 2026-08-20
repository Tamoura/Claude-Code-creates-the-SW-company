import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // Pages-Router-only rules. They inspect `pages/_document`, which the App
      // Router does not have, and @next/eslint-plugin-next@14 implements them
      // with `context.getAncestors()`, removed in ESLint 9 — so they crash the
      // linter rather than reporting. Off for a reason, not for convenience.
      '@next/next/no-duplicate-head': 'off',
      '@next/next/no-head-import-in-document': 'off',
      '@next/next/no-document-import-in-page': 'off',
      '@next/next/no-title-in-document-head': 'off',

      'no-console': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'bpmn-js',
              message:
                'ADR-006: bpmn-js carries a non-removable watermark linking to a competitor. Use @xyflow/react.',
            },
          ],
        },
      ],
      // Article IX / addendum pattern 8 — scaleX(-1) mirrors Arabic glyphs.
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/scaleX\\(-1\\)/]",
          message:
            'RTL is a coordinate projection, never a CSS mirror — scaleX(-1) reverses Arabic text (addendum pattern 8).',
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: { 'no-console': 'off' },
  },
  {
    ignores: [
      '.next/',
      'node_modules/',
      'coverage/',
      'next-env.d.ts',
      // This file: its own no-restricted-syntax message contains the literal
      // it forbids, so linting it flags the rule against itself.
      'eslint.config.mjs',
    ],
  },
];
