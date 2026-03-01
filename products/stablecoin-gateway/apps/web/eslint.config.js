import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import security from 'eslint-plugin-security'
import noSecrets from 'eslint-plugin-no-secrets'
import noUnsanitized from 'eslint-plugin-no-unsanitized'
import jsxA11y from 'eslint-plugin-jsx-a11y'

// ConnectSW standard: extends @connectsw/eslint-config/frontend rules via flat config.
// Security + accessibility rules mirror packages/eslint-config/frontend.js.
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      security.configs['recommended-legacy'],
    ],
    plugins: {
      'no-secrets': noSecrets,
      'no-unsanitized': noUnsanitized,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // ── Clean Code: Complexity ───────────────────────────────────────────
      'complexity': ['error', 10],
      'max-depth': ['error', 3],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],

      // ── TypeScript ─────────────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

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

      // ── Console in Browser ─────────────────────────────────────────────
      'no-console': 'error',

      // ── Accessibility ──────────────────────────────────────────────────
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
    },
  },
])
