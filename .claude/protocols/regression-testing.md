# Regression Testing Protocol

## Rule: Every New Feature Must Add Regression Tests

When any feature is delivered (via `new-feature` workflow or as part of `new-product`), the QA Engineer or implementing agent **MUST** add at least one regression E2E test to `e2e/tests/regression/`.

## Directory Structure

```
products/<name>/e2e/
├── tests/
│   ├── regression/           ← Regression suite (grows with every feature)
│   │   ├── auth.spec.ts      ← Added when auth was built
│   │   ├── dashboard.spec.ts ← Added when dashboard was built
│   │   └── payments.spec.ts  ← Added when payments was built
│   ├── smoke.spec.ts         ← Quick health checks
│   ├── flow1-auth.spec.ts    ← Detailed feature tests
│   └── ...
├── playwright.config.ts
└── package.json
```

## What Goes in Regression Tests

Regression tests verify **critical user paths that must never break**:

1. **Happy path** of the feature (the most common user flow)
2. **Integration points** with existing features
3. **Data integrity** checks (did the feature create/modify data correctly?)

Regression tests should be:
- **Fast**: Each test < 30 seconds
- **Independent**: No test depends on another
- **Deterministic**: Same result every run (no flaky selectors)
- **Named clearly**: `feature-name.spec.ts`

## Naming Convention

```
e2e/tests/regression/<feature-kebab-case>.spec.ts
```

Examples:
- `auth-login.spec.ts`
- `assessment-complete.spec.ts`
- `learning-path-create.spec.ts`
- `profile-update.spec.ts`

## Running Regression Suite

```bash
# Run regression suite only
npx playwright test tests/regression/

# Run all tests
npx playwright test

# Run from Command Center
# Navigate to /regression → select product → "Run Regression"
```

## Playwright Config

All products use always-on capture for Command Center visibility:

```typescript
use: {
  screenshot: 'on',     // Always capture — viewable in Command Center E2E Gallery
  video: 'on',          // Always record — viewable in Command Center E2E Gallery
  trace: 'on-first-retry',
}
```

## Orchestrator Enforcement

The orchestrator **MUST** verify regression tests are included in the agent's completion report for any `new-feature` task. If missing, the task is sent back.

Checklist for orchestrator:
- [ ] Feature has at least 1 regression spec in `e2e/tests/regression/`
- [ ] Regression spec covers the happy path
- [ ] All existing regression tests still pass
- [ ] Screenshots and videos are generated (check `test-results/`)
