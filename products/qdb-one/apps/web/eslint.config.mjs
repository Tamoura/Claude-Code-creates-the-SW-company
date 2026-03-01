import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";
import noSecrets from "eslint-plugin-no-secrets";
import jsxA11y from "eslint-plugin-jsx-a11y";
import noUnsanitized from "eslint-plugin-no-unsanitized";

// ConnectSW standard: extends @connectsw/eslint-config/frontend rules via flat config.
// Security + accessibility rules mirror packages/eslint-config/frontend.js.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  security.configs["recommended-legacy"],
  {
    plugins: {
      "no-secrets": noSecrets,
      "jsx-a11y": jsxA11y,
      "no-unsanitized": noUnsanitized,
    },
    rules: {
      // ── Clean Code: Complexity ───────────────────────────────────────────
      'complexity': ['error', 10],
      'max-depth': ['error', 3],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['error', 2],
      'max-params': ['error', 4],

      // ── TypeScript ─────────────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',

      // ── Security: XSS Prevention ───────────────────────────────────────
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',

      // ── Security: OWASP ────────────────────────────────────────────────
      'security/detect-eval-with-expression': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-object-injection': 'warn',

      // ── Secrets Detection ──────────────────────────────────────────────
      'no-secrets/no-secrets': ['error', { tolerance: 4.2 }],

      // ── No console in browser code ─────────────────────────────────────
      'no-console': 'error',

      // ── Accessibility (key rules from jsx-a11y/strict) ─────────────────
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/aria-role': 'error',
    },
  },
  {
    files: ['**/*.test.tsx', '**/*.spec.tsx', '**/*.stories.tsx', '**/tests/**/*.tsx'],
    rules: {
      'no-console': 'off',
      'max-lines-per-function': 'off',
      'no-secrets/no-secrets': 'off',
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
