# ConnectSW Testing Standards

**Last Updated**: 2026-01-29

## Core Principle

**ZERO ERRORS ON FIRST RUN**

The CEO should NEVER encounter errors when running a product for the first time. All configuration issues, dependency problems, and runtime errors MUST be caught by automated tests before CEO checkpoint.

---

## Mandatory Testing Gates

### Gate 1: Build & Configuration Test
**Run immediately after product creation**

```bash
# Frontend (Vite)
npm run build

# Frontend (Next.js)
npm run build

# Backend
npm run build  # or tsc if TypeScript
```

**Must Pass**:
- ✅ No TypeScript errors
- ✅ No missing dependencies
- ✅ No configuration errors (Tailwind, PostCSS, etc.)
- ✅ Build completes successfully
- ✅ No warnings about deprecated packages

**If Fails**: Route back to engineer, fix issues, re-run build

---

### Gate 2: Development Server Start Test
**Run before any CEO demo or checkpoint**

```bash
# Start dev server
npm run dev &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Check if server is running
lsof -i :$PORT || (echo "Server failed to start" && exit 1)

# Verify server responds
curl -f http://localhost:$PORT || (echo "Server not responding" && exit 1)

# Check for errors in logs
if grep -i "error\|fail\|cannot\|undefined" server.log; then
  echo "Errors found in server logs"
  exit 1
fi

# Clean up
kill $SERVER_PID
```

**Must Pass**:
- ✅ Server starts without errors
- ✅ Server responds to HTTP requests
- ✅ No errors in console/logs
- ✅ Correct port assignment
- ✅ No dependency warnings

**If Fails**: Route back to engineer, fix issues, re-run test

---

### Gate 3: Visual Smoke Test
**Run before CEO checkpoint**

Automated visual verification using Playwright:

```typescript
// tests/smoke.spec.ts
import { test, expect } from '@playwright/test';

test('homepage loads without errors', async ({ page }) => {
  // Listen for console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Navigate to homepage
  await page.goto('http://localhost:PORT');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Check no console errors
  expect(errors).toHaveLength(0);

  // Verify page title
  await expect(page).toHaveTitle(/.+/);

  // Verify main content visible
  const body = await page.locator('body');
  await expect(body).toBeVisible();

  // Take screenshot for verification
  await page.screenshot({ path: 'smoke-test-screenshot.png' });
});

test('navigation works', async ({ page }) => {
  await page.goto('http://localhost:PORT');

  // Verify links/buttons are clickable
  const buttons = await page.locator('button, a').count();
  expect(buttons).toBeGreaterThan(0);

  // Check first button/link is visible and has text
  const firstButton = page.locator('button, a').first();
  await expect(firstButton).toBeVisible();
});

test('no network errors', async ({ page }) => {
  const failedRequests: string[] = [];

  page.on('requestfailed', request => {
    failedRequests.push(request.url());
  });

  await page.goto('http://localhost:PORT');
  await page.waitForLoadState('networkidle');

  expect(failedRequests).toHaveLength(0);
});
```

**Must Pass**:
- ✅ Page loads successfully
- ✅ No JavaScript console errors
- ✅ No network request failures
- ✅ Main content visible
- ✅ Interactive elements (buttons/links) visible
- ✅ No CSS/styling issues

**If Fails**: Route back to Frontend Engineer, fix issues, re-run test

---

### Gate 4: Feature Functionality Test
**Run before CEO checkpoint**

Test core features work:

```typescript
test('core features work', async ({ page }) => {
  await page.goto('http://localhost:PORT');

  // Test based on product type
  // Example for form-based products:
  await page.fill('input[type="text"]', 'test input');
  await page.click('button[type="submit"]');

  // Verify no errors after interaction
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.waitForTimeout(2000);
  expect(errors).toHaveLength(0);
});
```

**Must Pass**:
- ✅ Primary user flows work
- ✅ No errors during interaction
- ✅ Expected results appear
- ✅ No broken functionality

**If Fails**: Route back to engineer, fix issues, re-run test

---

## Test Automation Scripts

### Required in Every Product

Every product MUST have these npm scripts:

```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:smoke": "playwright test tests/smoke.spec.ts",
    "test:all": "npm run build && npm test && npm run test:smoke"
  }
}
```

---

## Orchestrator Testing Workflow

### Before EVERY CEO Checkpoint

```markdown
## Mandatory Pre-Checkpoint Testing

1. **Build Test**
   ```bash
   cd products/[product]/apps/[app]
   npm run build
   ```
   ✅ Must pass or STOP

2. **Start Test**
   ```bash
   npm run dev &
   sleep 5
   curl -f http://localhost:[PORT]
   ```
   ✅ Must pass or STOP

3. **Smoke Test**
   ```bash
   npm run test:smoke
   ```
   ✅ Must pass or STOP

4. **Visual Verification**
   - Open browser to http://localhost:[PORT]
   - Screenshot homepage
   - Verify no errors in console
   - Verify interactive elements visible

If ANY test fails:
- **DO NOT proceed to checkpoint**
- **Route back to engineer** with error details
- **Re-run all tests** after fix
- **Only proceed when ALL tests pass**
```

---

## Test Templates

### Playwright Config Template

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:PORT',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:PORT',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
```

### Smoke Test Template

```typescript
// tests/smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Zero Errors on First Run', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test('homepage loads without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // No console errors
    expect(consoleErrors, 'Should have no console errors').toHaveLength(0);

    // Page has content
    const body = await page.locator('body').textContent();
    expect(body, 'Body should have content').toBeTruthy();

    // Main heading visible
    const heading = page.locator('h1').first();
    await expect(heading, 'Main heading should be visible').toBeVisible();
  });

  test('interactive elements work', async ({ page }) => {
    await page.goto('/');

    // Find all buttons
    const buttons = page.locator('button, [role="button"]');
    const count = await buttons.count();
    expect(count, 'Should have interactive buttons').toBeGreaterThan(0);

    // First button is visible and has text
    if (count > 0) {
      const firstButton = buttons.first();
      await expect(firstButton, 'Button should be visible').toBeVisible();

      const text = await firstButton.textContent();
      expect(text?.trim(), 'Button should have text').toBeTruthy();
    }
  });

  test('no failed network requests', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(failedRequests, 'Should have no failed requests').toHaveLength(0);
  });

  test('no React/JS errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000); // Wait for React to render

    expect(consoleErrors, 'Should have no React errors').toHaveLength(0);
  });
});
```

---

## Agent Responsibilities

### Frontend Engineer
- ✅ Write smoke tests for every product
- ✅ Ensure `npm run build` passes
- ✅ Ensure `npm run dev` starts without errors
- ✅ Verify no console errors in browser
- ✅ Test on correct port from PORT-REGISTRY.md
- ✅ Run `npm run test:smoke` before marking complete

### Backend Engineer
- ✅ Write API smoke tests
- ✅ Ensure `npm run build` passes
- ✅ Ensure server starts on correct port
- ✅ Verify health check endpoint works
- ✅ Test API responds correctly
- ✅ Run tests before marking complete

### QA Engineer
- ✅ Run full test suite before checkpoint
- ✅ Verify smoke tests pass
- ✅ Manual verification of UI/UX
- ✅ Create test report
- ✅ **BLOCK checkpoint if tests fail**

### Orchestrator
- ✅ **ENFORCE testing before checkpoints**
- ✅ Run automated test suite
- ✅ Verify build succeeds
- ✅ Verify server starts
- ✅ Run smoke tests
- ✅ **DO NOT proceed to CEO if ANY test fails**
- ✅ Route back to engineer for fixes
- ✅ Re-test after fixes

---

## Testing Checklist Template

Copy this to product-specific test reports:

```markdown
## Pre-Checkpoint Testing Report

**Product**: [name]
**Date**: [YYYY-MM-DD]
**Tester**: [Agent name]

### Build Test
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No dependency warnings
- [ ] Build output generated

### Server Start Test
- [ ] `npm run dev` starts without errors
- [ ] Server running on correct port ([PORT])
- [ ] Server responds to HTTP requests
- [ ] No errors in server logs

### Smoke Test
- [ ] `npm run test:smoke` passes
- [ ] Homepage loads successfully
- [ ] No console errors
- [ ] Interactive elements visible
- [ ] No network request failures

### Visual Verification
- [ ] Homepage screenshot taken
- [ ] Main content visible
- [ ] Buttons/links styled correctly
- [ ] No layout issues
- [ ] Correct branding/colors

### Verdict
- [ ] ✅ PASS - All tests passed, ready for CEO
- [ ] ❌ FAIL - Issues found, routing back to [engineer]

**Issues Found** (if any):
[List issues here]

**Next Steps**:
[What needs to be fixed]
```

---

## Consequences of Skipping Tests

**If Orchestrator proceeds to checkpoint without testing**:
1. CEO sees errors on first run
2. Wastes CEO time
3. Damages trust in the system
4. Requires re-work and delays

**If Engineer skips tests**:
1. QA catches issues (good)
2. Delays delivery
3. Extra iteration cycle

**If QA skips tests**:
1. CEO sees errors (bad)
2. Immediate escalation
3. Process review required

---

## Summary

### The Rule

**NO product reaches CEO checkpoint without**:
1. ✅ Successful build
2. ✅ Successful server start
3. ✅ Passing smoke tests
4. ✅ Visual verification
5. ✅ Zero console errors

### Who Enforces This

1. **Engineers**: Self-test before marking complete
2. **QA Engineer**: Comprehensive testing before checkpoint
3. **Orchestrator**: Final verification, blocks if tests fail

### Result

**CEO always sees**:
- ✅ Clean first run
- ✅ No errors
- ✅ Working product
- ✅ Professional experience

---

*Updated: 2026-01-29*
*Reason: User feedback - "I don't want to see errors on first run anymore"*
