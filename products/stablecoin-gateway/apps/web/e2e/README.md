# StableFlow E2E Test Suite

## Overview

This comprehensive Playwright E2E test suite catches all critical UI bugs found during manual testing, including:

1. Sign out button not working (no redirect after logout)
2. Simulate Payment button in header has no onClick handler
3. User icon showing hardcoded "JS" instead of real initials
4. User avatar not clickable
5. Broken navigation links

## Test Files

### 1. `ui-interactions.spec.ts` - CRITICAL BUG COVERAGE

This is the most important file that would have caught all CEO-reported bugs.

**Tests:**
- Sign out from user dropdown redirects to /login
- Sign out from Security page redirects to /login
- Simulate Payment button is clickable and functional
- User avatar shows initials from logged-in user email (not hardcoded "JS")
- User avatar opens dropdown menu on click
- User dropdown Settings/Security navigation
- All sidebar links navigate correctly (Dashboard, Payments, Invoices, API Keys, Webhooks, Security)
- View All button navigates to payments page
- Dashboard checkout preview simulate payment works
- Dashboard loads without console errors

**Bug Coverage:**
- BUG #1: Sign out redirect - 2 tests
- BUG #2: Simulate Payment functionality - 2 tests
- BUG #3: User avatar issues - 4 tests
- BUG #4: Navigation links - 6 tests

### 2. `auth-complete.spec.ts` - Full Authentication Flows

**Tests:**
- Landing page shows Sign In and Get Started buttons
- Navigation from landing to login/signup
- Login and signup page field validation
- Full signup -> login -> dashboard -> logout flow
- Unauthenticated user redirect
- Login with wrong password shows error
- Login/signup page cross-navigation links

### 3. `api-keys-crud.spec.ts` - API Keys Management

**Tests:**
- API Keys page loads and shows create button
- Can create and then revoke an API key
- No "Failed to connect to API" errors

### 4. `webhooks-crud.spec.ts` - Webhooks Management

**Tests:**
- Webhooks page loads
- Can navigate to webhooks and see add button

### 5. `security-page.spec.ts` - Security Page Functionality

**Tests:**
- Security page shows user email
- Change password button toggles form
- Show sessions toggle works
- Sign out in danger zone redirects to login

## Running the Tests

### Prerequisites

Make sure both backend and frontend are running:

```bash
# Terminal 1: Start backend (port 5001)
cd products/stablecoin-gateway/apps/api
npm run dev

# Terminal 2: Start frontend (port 3104)
cd products/stablecoin-gateway/apps/web
npm run dev
```

### Run All E2E Tests

```bash
cd products/stablecoin-gateway/apps/web
npm run test:e2e
```

### Run Specific Test File

```bash
# Run only UI interaction tests
npx playwright test ui-interactions.spec.ts

# Run only auth tests
npx playwright test auth-complete.spec.ts

# Run only security page tests
npx playwright test security-page.spec.ts
```

### Run in UI Mode (Debug)

```bash
npx playwright test --ui
```

### Run in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Run Specific Test

```bash
npx playwright test --grep "sign out from user dropdown"
```

## Test Architecture

### Helpers

Each test file uses helper functions for common operations:

```typescript
// Create test user via API
async function createTestUser(request: any) {
  await request.post(`${API_URL}/v1/auth/signup`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
}

// Login via UI
async function loginViaUI(page: any) {
  await page.goto('/login');
  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}
```

### Test Data

Tests use unique timestamps to avoid collisions:

```typescript
const TEST_EMAIL = `e2e-ui-${Date.now()}@test.com`;
const TEST_PASSWORD = 'TestPassword123!@#';
```

### Lifecycle Hooks

```typescript
test.beforeAll(async ({ request }) => {
  // Create test user once for entire test suite
  await createTestUser(request);
});

test.beforeEach(async ({ page }) => {
  // Login before each test
  await loginViaUI(page);
});
```

## What These Tests Catch

### Sign Out Bug
- **Issue**: Sign out doesn't redirect to /login
- **Tests**: `ui-interactions.spec.ts` - lines 36-62
- **Coverage**: Both user dropdown and Security page sign out

### Simulate Payment Bug
- **Issue**: Header button has no onClick handler
- **Tests**: `ui-interactions.spec.ts` - lines 64-77
- **Coverage**: Verifies button is enabled and functional

### User Avatar Bug
- **Issue**: Shows hardcoded "JS" instead of real initials
- **Tests**: `ui-interactions.spec.ts` - lines 79-113
- **Coverage**: Verifies real initials, clickability, dropdown menu

### Navigation Bug
- **Issue**: Broken sidebar links
- **Tests**: `ui-interactions.spec.ts` - lines 115-142
- **Coverage**: All 6 sidebar navigation links

## Configuration

**Playwright Config**: `playwright.config.ts`
- Base URL: `http://localhost:3104`
- Test directory: `./e2e`
- Browser: Chromium (Desktop Chrome)
- Auto-starts dev server

**API URL**: `http://localhost:5001`
- Used for creating test users via API
- Avoids UI flakiness for setup

## Best Practices Used

1. **API Setup**: Create users via API, test via UI
2. **Unique Test Data**: Timestamp-based emails avoid collisions
3. **Explicit Waits**: `waitForURL`, `toBeVisible` with timeouts
4. **Error Filtering**: Ignore expected network errors in dev
5. **Focused Assertions**: Each test verifies one behavior
6. **Real User Flow**: Login -> action -> verify -> logout

## Debugging Failed Tests

### View Test Report

```bash
npx playwright show-report
```

### Run with Trace

```bash
npx playwright test --trace on
```

### Run Single Test in Debug Mode

```bash
npx playwright test --debug --grep "user avatar shows initials"
```

### View Screenshots

Failed tests automatically capture screenshots in `test-results/`

## CI/CD Integration

The tests are configured to run in CI:

- Retries: 2 (in CI only)
- Workers: 1 (in CI, unlimited locally)
- Reporter: HTML
- Trace: On first retry

Add to GitHub Actions:

```yaml
- name: Run E2E Tests
  run: |
    cd products/stablecoin-gateway/apps/web
    npm run test:e2e
```

## Expected Test Count

- `ui-interactions.spec.ts`: 17 tests
- `auth-complete.spec.ts`: 10 tests
- `api-keys-crud.spec.ts`: 2 tests
- `webhooks-crud.spec.ts`: 2 tests
- `security-page.spec.ts`: 4 tests

**Total**: 35 comprehensive E2E tests

## Next Steps

1. Run the tests against the live stack
2. Fix any failing tests (they expose bugs!)
3. Add to CI/CD pipeline
4. Expand coverage for edge cases
5. Add visual regression tests

---

Generated for StableFlow stablecoin-gateway product
Port 3104 (frontend) | Port 5001 (backend)
