# Dynamic Test Generation Protocol

**Inspired by**: FullStack-Agent (arXiv:2602.03798) — Development-Oriented Testing with dynamic test case generation
**Purpose**: Generate test cases based on the current state of code, not just static spec acceptance criteria

## Concept

Traditional testing in ConnectSW: QA Engineer reads acceptance criteria from the spec, writes Playwright tests that verify those criteria. This catches spec-defined cases but misses:

- Edge cases the spec didn't anticipate
- Integration bugs between components
- State-dependent bugs (race conditions, stale data)
- Visual regressions in untested pages
- API error paths not in the acceptance criteria

Dynamic Test Generation: an AI agent examines the **current state of the codebase** and generates additional test cases targeting likely failure points.

## How It Works

### Phase 1: Code Analysis

The QA Engineer (or a specialized test agent) analyzes the current implementation:

```
Input: The implementation branch (all code changes)

Analysis targets:
1. API routes → What inputs are validated? What's missing?
2. Database operations → What constraints exist? What cascade rules?
3. Frontend components → What states are possible? What interactions exist?
4. Auth flows → What roles? What permissions? What happens with expired tokens?
5. Error handling → Are all error paths reachable and handled?
```

### Phase 2: Test Case Generation

Based on analysis, generate test cases in these categories:

#### Category 1: Boundary Value Tests

```
For each numeric input:
├── Test with 0
├── Test with -1 (negative)
├── Test with MAX_SAFE_INTEGER
├── Test with decimal when integer expected
└── Test with NaN / Infinity

For each string input:
├── Test with empty string ""
├── Test with very long string (10,000+ chars)
├── Test with special characters (<script>, SQL injection attempts)
├── Test with unicode / emoji
└── Test with whitespace-only string

For each array input:
├── Test with empty array []
├── Test with single item
├── Test with 1000+ items (pagination)
└── Test with duplicate items
```

#### Category 2: State Transition Tests

```
For each entity lifecycle:
├── Create → Read → Verify match
├── Create → Update → Read → Verify updated
├── Create → Delete → Read → Verify 404
├── Create → Delete → Re-create → Verify no conflict
├── Create with same key twice → Verify 409 (not crash)
└── Update non-existent → Verify 404 (not 500)
```

#### Category 3: Concurrent Operation Tests

```
For each shared resource:
├── Two simultaneous creates with same unique key → One succeeds, one 409
├── Read during update → Returns consistent data (not partial)
├── Delete during read → Handles gracefully
└── Multiple updates to same record → Last write wins (no corruption)
```

#### Category 4: Frontend Interaction Tests

```
For each page, dynamically generate:
├── Click every clickable element → verify response
├── Submit every form with valid data → verify success
├── Submit every form with empty data → verify validation messages
├── Navigate to every link → verify destination
├── Resize to 375px, 768px, 1024px → verify no layout breaks
├── Rapid-click submit button → verify no duplicate submissions
├── Navigate away during form submit → verify no crash
└── Refresh page mid-operation → verify recovery
```

#### Category 5: Error Recovery Tests

```
For each external dependency (database, API, Redis):
├── What happens if connection drops mid-request?
├── What happens if response is malformed?
├── What happens if latency exceeds timeout?
└── Does the UI show a meaningful error (not blank page)?
```

### Phase 3: Test Prioritization

Not all generated tests are worth writing. Prioritize by:

```
Priority = (Failure_Impact × Failure_Probability) / Implementation_Cost

HIGH priority (always write):
├── Security boundary tests (auth bypass, injection)
├── Data integrity tests (cascade deletes, orphans)
├── Payment/financial operation tests
└── User-facing error recovery tests

MEDIUM priority (write if time allows):
├── Boundary value tests for critical inputs
├── Concurrent operation tests
└── Pagination/performance edge cases

LOW priority (document but skip):
├── Extreme boundary values (unlikely in practice)
├── UI tests for non-critical pages
└── Tests for known framework-handled cases
```

### Phase 4: Test Output

Generate tests in two formats:

#### Playwright E2E Tests (for QA)

```typescript
// Generated: Dynamic tests for [feature] - [date]
// Source: Dynamic Test Generation from code analysis

import { test, expect } from '@playwright/test';

test.describe('[Feature] - Dynamic Edge Cases', () => {

  test('boundary: form rejects empty submission', async ({ page }) => {
    await page.goto('/create');
    await page.click('button[type="submit"]');
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('boundary: handles very long input gracefully', async ({ page }) => {
    await page.goto('/create');
    await page.fill('input[name="name"]', 'A'.repeat(10000));
    await page.click('button[type="submit"]');
    // Should show validation error, not crash
    await expect(page.locator('.error, [role="alert"]')).toBeVisible();
  });

  test('rapid: double-click submit does not create duplicate', async ({ page }) => {
    await page.goto('/create');
    await page.fill('input[name="name"]', 'Test Item');
    // Double-click submit
    await page.dblclick('button[type="submit"]');
    // Wait for navigation or response
    await page.waitForTimeout(2000);
    // Verify only one record created (check list page)
    await page.goto('/list');
    const items = await page.locator('[data-testid="item"]').count();
    expect(items).toBe(1);
  });
});
```

#### Integration Tests (for Backend Engineer)

```typescript
// Generated: Dynamic tests for [API] - [date]

describe('[API Route] - Dynamic Edge Cases', () => {

  it('boundary: rejects request body > 1MB', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/items',
      payload: { data: 'X'.repeat(2_000_000) }
    });
    expect(response.statusCode).toBe(413);
  });

  it('boundary: handles unicode in all string fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/items',
      payload: { name: 'Test Item', description: 'Description' }
    });
    expect(response.statusCode).toBe(201);
  });

  it('state: delete then re-create with same unique key', async () => {
    // Create
    await app.inject({ method: 'POST', url: '/api/v1/items', payload: { key: 'unique-1' } });
    // Delete
    await app.inject({ method: 'DELETE', url: '/api/v1/items/unique-1' });
    // Re-create (should succeed, not 409)
    const response = await app.inject({
      method: 'POST', url: '/api/v1/items', payload: { key: 'unique-1' }
    });
    expect(response.statusCode).toBe(201);
  });
});
```

## Integration with ConnectSW Workflow

### When to Run

1. **After /speckit.tasks but before implementation** — generate test templates from the spec
2. **After implementation, before QA gate** — generate tests from actual code
3. **Before CEO checkpoint** — final round of dynamic tests on the complete feature

### In the QA Engineer's Testing Gate

Add as Step 1.5 (before running existing tests):

```
Step 1: Run Unit Tests → PASS/FAIL
Step 1.5: Generate Dynamic Tests → [N new test cases generated]  ← NEW
  ├── Analyze current code changes
  ├── Generate edge case tests
  ├── Prioritize by impact
  ├── Write HIGH priority tests
  └── Add to test suite
Step 2: Run Integration Tests → PASS/FAIL
Step 2.5: Run Database State Verification → PASS/FAIL
Step 3: Run E2E Tests (including dynamic) → PASS/FAIL
Step 4: Interactive Element Verification → PASS/FAIL
Step 5: Visual Verification → PASS/FAIL
```

### Tracking

Store generated test metadata in `.claude/memory/metrics/dynamic-test-metrics.json`:

```json
{
  "sessions": [],
  "totals": {
    "tests_generated": 0,
    "tests_written": 0,
    "bugs_found_by_dynamic_tests": 0,
    "bugs_missed_by_static_tests": 0,
    "false_positives": 0
  }
}
```

**Target**: Dynamic tests find 20%+ additional bugs not covered by spec-derived tests.
