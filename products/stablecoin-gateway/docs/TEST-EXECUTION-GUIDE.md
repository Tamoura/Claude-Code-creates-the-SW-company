# Test Execution Guide - Stablecoin Gateway

**Product**: Stablecoin Gateway
**Branch**: `feature/stablecoin-gateway/production-ready`
**Date**: 2026-01-28
**Purpose**: Step-by-step guide to execute all tests and verify production readiness

---

## Quick Start (30 seconds)

Run all tests in one go:

```bash
# Navigate to project root
cd /Users/tamer/Desktop/Projects/Claude\ Code\ creates\ the\ SW\ company/products/stablecoin-gateway

# Backend tests
cd apps/api && npm test

# Frontend tests
cd ../web && npm test

# E2E tests
npm run test:e2e
```

---

## Test Suite Summary

| Type | Location | Count | Framework | Command |
|------|----------|-------|-----------|---------|
| **Backend Unit** | `apps/api/tests/unit/` | 18 | Jest | `npm test` |
| **Backend Services** | `apps/api/tests/services/` | 35 | Jest | `npm test` |
| **Backend Integration** | `apps/api/tests/integration/` | 17 | Jest | `npm test` |
| **Frontend Unit** | `apps/web/src/**/*.test.tsx` | ~52 | Vitest | `npm test` |
| **E2E** | `apps/web/e2e/` | 3 | Playwright | `npm run test:e2e` |
| **TOTAL** | - | **113** | - | - |

---

## Prerequisites

### Required
- [x] Node.js 20+
- [x] npm or yarn
- [x] PostgreSQL 15+ (running)
- [x] Git repository cloned

### Optional (for full E2E)
- [ ] Redis 7+ (for backend workers)
- [ ] Chrome/Chromium browser (for Playwright)

### Verify Setup

```bash
# Check Node version
node --version  # Should be 20.x or higher

# Check PostgreSQL is running
psql --version

# Check dependencies installed
cd apps/api && npm list --depth=0
cd apps/web && npm list --depth=0
```

---

## Phase 1: Backend Tests (58 tests)

### 1.1 Navigate to Backend

```bash
cd /Users/tamer/Desktop/Projects/Claude\ Code\ creates\ the\ SW\ company/products/stablecoin-gateway/apps/api
```

### 1.2 Install Dependencies (if needed)

```bash
npm install
```

Expected: ~590 packages installed in ~1 minute

### 1.3 Run All Backend Tests

```bash
npm test
```

**Expected Output**:
```
PASS tests/unit/crypto.test.ts (7 tests)
PASS tests/unit/validation.test.ts (8 tests)
PASS tests/unit/logger.test.ts (3 tests)
PASS tests/services/auth.service.test.ts (12 tests)
PASS tests/services/payment.service.test.ts (15 tests)
PASS tests/services/webhook.service.test.ts (8 tests)
PASS tests/integration/auth.test.ts (7 tests)
PASS tests/integration/payment-sessions.test.ts (10 tests)

Test Suites: 8 passed, 8 total
Tests:       58 passed, 58 total
Snapshots:   0 total
Time:        ~15-30 seconds
```

### 1.4 Run with Coverage

```bash
npm run test:coverage
```

**Expected Coverage**:
```
----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   85+   |   80+    |   85+   |   85+   |
 routes/v1/           |   85+   |   80+    |   90+   |   85+   |
 services/            |   90+   |   85+    |   95+   |   90+   |
 utils/               |   95+   |   90+    |  100    |   95+   |
 plugins/             |   80+   |   75+    |   85+   |   80+   |
----------------------|---------|----------|---------|---------|
```

**Coverage Report Location**: `apps/api/coverage/lcov-report/index.html`

### 1.5 Troubleshooting Backend Tests

**Issue: PostgreSQL connection error**
```
Solution: Ensure PostgreSQL is running and DATABASE_URL is set
```

**Issue: Prisma client not generated**
```bash
npm run db:generate
```

**Issue: TypeScript errors**
```bash
npx tsc --noEmit
# Should show no errors
```

---

## Phase 2: Frontend Tests (~52 tests)

### 2.1 Navigate to Frontend

```bash
cd /Users/tamer/Desktop/Projects/Claude\ Code\ creates\ the\ SW\ company/products/stablecoin-gateway/apps/web
```

### 2.2 Install Dependencies (if needed)

```bash
npm install
```

Expected: ~300 packages installed in ~30 seconds

### 2.3 Run All Frontend Unit Tests

```bash
npm test
```

**Expected Output**:
```
✓ src/components/PaymentForm.test.tsx (10 tests)
✓ src/components/StatusDisplay.test.tsx (8 tests)
✓ src/components/WalletConnector.test.tsx (6 tests)
✓ src/hooks/usePaymentSession.test.ts (5 tests)
✓ src/hooks/useWalletConnection.test.ts (4 tests)
... (more test files)

Test Files: ~10 passed (~10 total)
Tests:      ~52 passed (~52 total)
Time:       ~5-10 seconds
```

### 2.4 Run with Coverage

```bash
npm test -- --coverage
```

**Expected Coverage**:
```
----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   80+   |   75+    |   80+   |   80+   |
 components/          |   85+   |   80+    |   85+   |   85+   |
 hooks/               |   90+   |   85+    |   90+   |   90+   |
 lib/                 |   95+   |   90+    |   95+   |   95+   |
----------------------|---------|----------|---------|---------|
```

### 2.5 Troubleshooting Frontend Tests

**Issue: Module not found**
```bash
npm install
```

**Issue: TypeScript errors**
```bash
npx tsc --noEmit
# Should show no errors
```

**Issue: React testing errors**
```
Solution: Ensure @testing-library/react and jsdom are installed
```

---

## Phase 3: E2E Tests (3 tests)

### 3.1 Ensure You're in Frontend Directory

```bash
cd /Users/tamer/Desktop/Projects/Claude\ Code\ creates\ the\ SW\ company/products/stablecoin-gateway/apps/web
```

### 3.2 Install Playwright Browsers (first time only)

```bash
npx playwright install chromium
```

Expected: Downloads Chromium browser (~100MB, one-time)

### 3.3 Start Development Server

**Option A: Playwright will auto-start** (configured in playwright.config.ts)
```bash
npm run test:e2e
```

**Option B: Manual start** (for debugging)
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run E2E tests
npx playwright test
```

### 3.4 Run E2E Tests

```bash
npm run test:e2e
```

**Expected Output**:
```
Running 3 tests using 1 worker

✓ [chromium] › payment-flow.spec.ts:4:3 › Payment Flow › complete payment flow from link creation to confirmation (15s)
✓ [chromium] › payment-flow.spec.ts:54:3 › Payment Flow › displays error for non-existent payment (2s)
✓ [chromium] › payment-flow.spec.ts:59:3 › Payment Flow › form accepts valid amount (1s)

3 passed (18s)
```

### 3.5 View HTML Report

```bash
npx playwright show-report
```

Opens interactive HTML report in browser with:
- Screenshots of each step
- Network logs
- Console output
- Timeline of actions

### 3.6 Troubleshooting E2E Tests

**Issue: Dev server not starting**
```
Solution: Check port 3101 is available
lsof -i :3101
kill -9 <PID>
```

**Issue: Page not loading**
```
Solution: Verify VITE_API_URL in .env
cat .env
```

**Issue: Timeout errors**
```
Solution: Increase timeout in playwright.config.ts or run with --timeout flag
npx playwright test --timeout=60000
```

**Issue: Headless browser issues**
```
Solution: Run in headed mode for debugging
npx playwright test --headed
```

---

## Phase 4: Build Verification

### 4.1 Backend Build

```bash
cd /Users/tamer/Desktop/Projects/Claude\ Code\ creates\ the\ SW\ company/products/stablecoin-gateway/apps/api
npm run build
```

**Expected Output**:
```
> @stablecoin-gateway/api@1.0.0 build
> tsc

✓ Compiled successfully
✓ Output in dist/
```

**Verify**:
```bash
ls -la dist/
# Should show compiled .js files
```

### 4.2 Frontend Build

```bash
cd /Users/tamer/Desktop/Projects/Claude\ Code\ creates\ the\ SW\ company/products/stablecoin-gateway/apps/web
npm run build
```

**Expected Output**:
```
> web@0.0.0 build
> tsc -b && vite build

vite v7.2.4 building for production...
✓ 120 modules transformed.
dist/index.html                   0.5 kB
dist/assets/index-abc123.js       150 kB
dist/assets/index-abc123.css      25 kB

✓ built in 3.5s
```

**Verify**:
```bash
ls -la dist/
# Should show index.html and assets/
```

---

## Phase 5: Automated Testing Gate

Run the comprehensive testing gate script:

```bash
cd /Users/tamer/Desktop/Projects/Claude\ Code\ creates\ the\ SW\ company
./.claude/scripts/testing-gate-checklist.sh stablecoin-gateway
```

**What It Does**:
1. Verifies prerequisites (package.json, node_modules)
2. Runs all unit tests
3. Runs E2E tests
4. Checks code quality (linting, no console.error)
5. Generates coverage report
6. Returns PASS/FAIL status

**Expected Output**:
```
╔══════════════════════════════════════════════════════════════╗
║           TESTING GATE CHECKLIST: stablecoin-gateway        ║
║           Tue Jan 28 14:30:00 PST 2026                      ║
╚══════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────┐
│ Phase 1: Prerequisites                                       │
└──────────────────────────────────────────────────────────────┘
Checking: Package.json exists...                           ✅ PASS
Checking: Node modules installed...                        ✅ PASS
Checking: TypeScript compiles...                           ✅ PASS

┌──────────────────────────────────────────────────────────────┐
│ Phase 2: Unit Tests                                          │
└──────────────────────────────────────────────────────────────┘
Checking: Unit tests pass...                               ✅ PASS

┌──────────────────────────────────────────────────────────────┐
│ Phase 3: E2E Tests                                           │
└──────────────────────────────────────────────────────────────┘
Checking: E2E test directory exists...                     ✅ PASS
Checking: E2E tests pass...                                ✅ PASS

┌──────────────────────────────────────────────────────────────┐
│ Phase 4: Code Quality                                        │
└──────────────────────────────────────────────────────────────┘
Checking: Linting passes...                                ✅ PASS
Checking: No console.error in production...                ✅ PASS
Checking: No TODO/FIXME in production...                   ✅ PASS

┌──────────────────────────────────────────────────────────────┐
│ Phase 5: Test Coverage                                       │
└──────────────────────────────────────────────────────────────┘
Checking: Coverage >= 80%...                               ✅ PASS (85%)

╔══════════════════════════════════════════════════════════════╗
║                         RESULTS                              ║
╚══════════════════════════════════════════════════════════════╝

  ✅ Passed:   10
  ❌ Failed:   0
  ⚠️  Warnings: 0

╔══════════════════════════════════════════════════════════════╗
║              ✅ TESTING GATE: PASS                           ║
╚══════════════════════════════════════════════════════════════╝

Ready for CEO checkpoint.
```

---

## Phase 6: Manual Visual Verification

**CRITICAL**: QA agent instructions require manual browser testing before CEO checkpoint.

### 6.1 Start Development Servers

```bash
# Terminal 1: Backend
cd apps/api && npm run dev
# API running at http://localhost:5001

# Terminal 2: Frontend
cd apps/web && npm run dev
# Frontend running at http://localhost:3101
```

### 6.2 Visual Checklist

**Homepage** (http://localhost:3101)
- [ ] Page loads without errors (check console)
- [ ] "Stablecoin Gateway" heading visible
- [ ] "Create Payment Link" section visible
- [ ] Amount input field has visible border
- [ ] "Generate Payment Link" button visible with proper styling
- [ ] Button has background color (not transparent)
- [ ] Layout is correct (no overlapping elements)

**Create Test Payment**
```bash
# Use API to create payment session
curl -X POST http://localhost:5001/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}'

# Copy access_token from response
export TOKEN="your_access_token_here"

curl -X POST http://localhost:5001/v1/payment-sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "merchant_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
  }'

# Copy checkout_url from response
```

**Payment Page** (from checkout_url)
- [ ] Payment details displayed correctly
- [ ] Amount shows $100.00 format
- [ ] Fee calculation displayed (0.5% = $0.50)
- [ ] "Connect Wallet" button visible and styled
- [ ] Network badge displayed (Polygon)
- [ ] Token badge displayed (USDC)
- [ ] QR code or payment address visible

**Browser Console** (F12 → Console tab)
- [ ] No red error messages
- [ ] No 404 errors for CSS/JS files
- [ ] API calls return 200/201 status codes

**Test in Multiple Browsers** (if available)
- [ ] Chrome/Chromium
- [ ] Firefox (optional)
- [ ] Safari (optional)

---

## Test Results Template

Copy this template to report results:

```markdown
# Test Execution Results

**Date**: 2026-01-28
**Executor**: [Your Name]
**Branch**: feature/stablecoin-gateway/production-ready

## Backend Tests
- Tests Run: 58
- Tests Passed: __
- Tests Failed: __
- Coverage: __%
- Status: PASS / FAIL

## Frontend Tests
- Tests Run: ~52
- Tests Passed: __
- Tests Failed: __
- Coverage: __%
- Status: PASS / FAIL

## E2E Tests
- Tests Run: 3
- Tests Passed: __
- Tests Failed: __
- Status: PASS / FAIL

## Build Verification
- Backend Build: SUCCESS / FAIL
- Frontend Build: SUCCESS / FAIL

## Visual Verification
- Homepage: PASS / FAIL
- Payment Page: PASS / FAIL
- Console: NO ERRORS / ERRORS FOUND

## Overall Status
- [ ] All tests passing (113/113)
- [ ] Coverage > 80%
- [ ] Builds successful
- [ ] Visual verification passed
- [ ] No blocking issues

**FINAL DECISION**: PASS / FAIL
```

---

## Success Criteria

For **FULL PASS**, all of the following must be true:

- ✅ **58/58 backend tests** pass
- ✅ **~52/52 frontend tests** pass
- ✅ **3/3 E2E tests** pass
- ✅ **Code coverage** > 80% (backend and frontend)
- ✅ **Backend build** succeeds (no TypeScript errors)
- ✅ **Frontend build** succeeds (no TypeScript errors)
- ✅ **Visual verification** passes (no UI bugs)
- ✅ **Browser console** has no errors

---

## Common Issues & Solutions

### Issue: Tests are slow
**Solution**: Use `--maxWorkers=50%` flag
```bash
npm test -- --maxWorkers=50%
```

### Issue: Database errors in tests
**Solution**: Reset test database
```bash
cd apps/api
npm run db:migrate:reset
npm run db:seed
```

### Issue: Port already in use
**Solution**: Find and kill process
```bash
lsof -i :3101  # or :5001
kill -9 <PID>
```

### Issue: E2E tests timing out
**Solution**: Increase timeout
```bash
npx playwright test --timeout=60000
```

### Issue: Coverage below 80%
**Solution**: Identify uncovered files
```bash
npm run test:coverage
# Open coverage/lcov-report/index.html
# Click on files with low coverage
```

---

## Next Steps After Tests Pass

1. **Update Testing Report**
   - Fill in test results
   - Document any issues found
   - Update `docs/TESTING-REPORT.md`

2. **Commit Test Results** (if changes made)
   ```bash
   git add .
   git commit -m "test: verify all 113 tests pass"
   ```

3. **Proceed to CEO Checkpoint**
   - Present QA Summary
   - Show test results
   - Demo application in browser
   - Discuss production readiness

4. **Prepare for Production**
   - Run security audit: `npm audit`
   - Update environment variables
   - Configure production database
   - Set up monitoring (Sentry, Datadog)

---

## Test Execution Checklist

Print this checklist and check off each item:

### Pre-Execution
- [ ] Node.js 20+ installed
- [ ] PostgreSQL running
- [ ] Dependencies installed (both apps)
- [ ] Chromium browser installed (for E2E)

### Backend Tests
- [ ] Navigate to `apps/api`
- [ ] Run `npm test`
- [ ] Verify 58/58 tests pass
- [ ] Run `npm run test:coverage`
- [ ] Verify coverage > 80%
- [ ] Run `npm run build`
- [ ] Verify build succeeds

### Frontend Tests
- [ ] Navigate to `apps/web`
- [ ] Run `npm test`
- [ ] Verify ~52 tests pass
- [ ] Run `npm test -- --coverage`
- [ ] Verify coverage > 80%
- [ ] Run `npm run test:e2e`
- [ ] Verify 3/3 E2E tests pass
- [ ] Run `npm run build`
- [ ] Verify build succeeds

### Visual Verification
- [ ] Start both dev servers
- [ ] Open http://localhost:3101 in browser
- [ ] Verify homepage renders correctly
- [ ] Create test payment via API
- [ ] Open payment page
- [ ] Verify payment page renders correctly
- [ ] Check browser console for errors
- [ ] Test in Chrome (minimum)

### Final Checks
- [ ] Run testing gate script
- [ ] Review generated report
- [ ] Document any issues
- [ ] Fill in test results template
- [ ] Make PASS/FAIL decision

---

**Guide Created**: 2026-01-28
**QA Engineer**: Claude QA Engineer
**Purpose**: Execute 113 tests and verify production readiness
**Estimated Time**: 30-45 minutes
