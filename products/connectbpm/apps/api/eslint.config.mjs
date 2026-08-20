import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';
import noSecrets from 'eslint-plugin-no-secrets';

// ConnectSW standard backend rules (mirrors packages/eslint-config/backend.js,
// which is still eslintrc-format; these are the flat-config equivalents).
//
// ConnectBPM additions over the standard set:
//   * no-restricted-imports bans every library that could turn customer-authored
//     process logic into a callable (NFR-009, ADR-002), plus @connectsw/billing's
//     UsageService (AC-013). The CI gate `pnpm gate:metering` is the backstop
//     that also catches dynamic and raw-SQL forms.
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  security.configs.recommended,
  {
    plugins: { 'no-secrets': noSecrets },
    rules: {
      // ── Clean Code: Complexity ─────────────────────────────────────────────
      complexity: ['error', 10],
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
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

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

      // ── Security: no path from customer input to a callable (NFR-009) ──────
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'vm2', message: 'NFR-009: no VM/sandbox. Conditions are a pinned AST (ADR-002).' },
            { name: 'isolated-vm', message: 'NFR-009: no VM/sandbox. Conditions are a pinned AST (ADR-002).' },
            { name: 'filtrex', message: 'NFR-009: third-party expression evaluators are banned (ADR-002).' },
            { name: 'expression-eval', message: 'NFR-009: third-party expression evaluators are banned (ADR-002).' },
            { name: 'jse-eval', message: 'NFR-009: third-party expression evaluators are banned (ADR-002).' },
            { name: 'safe-eval', message: 'NFR-009: third-party expression evaluators are banned (ADR-002).' },
            { name: 'bpmn-js', message: 'ADR-006: non-removable watermark linking to a competitor.' },
          ],
          patterns: [
            {
              group: ['@connectsw/billing*'],
              importNames: ['UsageService'],
              message:
                'AC-013: UsageService is a Redis counter keyed to userId and satisfies neither ' +
                'DEC-002 MET-2 nor MET-3. Use recordBillableCompletion(tx, ...).',
            },
          ],
        },
      ],

      // ── Tenancy / metering brand forgery (ADR-004 §2, ADR-007) ────────────
      // TenantScopedClient and TransitionTx are branded with NON-EXPORTED
      // unique symbols, so they cannot be built structurally and cannot be
      // reached by a single `as`. The one remaining escape is the double
      // assertion `raw as unknown as TenantScopedClient`, which TypeScript
      // permits anywhere. Both brands also carry a runtime grant, so a forged
      // client throws on first use — but a build failure is better than a
      // 500, and better still than a leak if a grant check is ever missed.
      //
      // Exempted by the overrides below: the modules that own each brand, and
      // the tests that prove forgery is refused.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'TSAsExpression > TSTypeReference > Identifier[name="TenantScopedClient"]',
          message:
            'AC-051: a TenantScopedClient may only come from withTenant(). ' +
            'Asserting a raw client into the brand reaches every tenant — the ' +
            'one bug class this product cannot survive (NFR-008, STRAT-01 K6).',
        },
        {
          selector:
            'TSAsExpression > TSTypeReference > Identifier[name="TransitionTx"]',
          message:
            'AC-012 / DEC-002 MET-2: a TransitionTx may only come from the ' +
            'Transition Coordinator. Asserting one writes the meter outside ' +
            'the transition transaction, which is unaccounted revenue.',
        },
      ],

      // ── Secrets Detection ──────────────────────────────────────────────────
      'no-secrets/no-secrets': ['error', { tolerance: 4.2 }],
    },
  },
  {
    // The modules that OWN the brands, and the tests that prove the brands
    // cannot be forged, are the only places the assertion is legitimate.
    files: [
      'src/tenancy/**/*.ts',
      'src/engine/transition-tx.ts',
      'tests/type-fixtures/**/*.ts',
      'tests/integration/tenancy/**/*.ts',
      'tests/unit/engine/**/*.ts',
    ],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts', 'scripts/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'max-params': 'off',
      // describe > it > callback is three levels by construction in Jest.
      'max-nested-callbacks': 'off',
      'no-secrets/no-secrets': 'off',
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'tests/fixtures/'],
  }
);
