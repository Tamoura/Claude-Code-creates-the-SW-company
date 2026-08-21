# Development-Oriented Testing Protocol

**Inspired by**: FullStack-Agent (arXiv:2602.03798) — Development-Oriented Testing methodology
**Impact**: 54% reduction in debugging iterations (from paper's ablation study)

## Purpose

Give Backend and Frontend Engineers real-time debugging feedback **during implementation** rather than waiting for the QA Engineer's Testing Gate. This catches bugs at the point of creation, not after integration.

## The Problem This Solves

**Before (ConnectSW current flow):**
```
Engineer writes code → Commits → QA runs Testing Gate → Finds bugs → Routes back to Engineer → Fix → Re-test
                                     ^--- days later, context lost
```

**After (Development-Oriented Testing):**
```
Engineer writes code → Dev-Test Tool validates immediately → Fix in-context → Commit clean code → QA confirms
                            ^--- seconds later, full context
```

---

## Backend Development-Oriented Testing Tool

### What It Does

A Postman-style API testing protocol that Backend Engineers use **during coding** (not after). After implementing each endpoint, the engineer immediately validates it by:

1. Starting the dev server
2. Making real HTTP requests to the endpoint
3. Inspecting the response AND the server console output
4. Checking database state after the operation

### Protocol

```
For EACH endpoint implemented:

Step 1: Start the service
├── Run: npm run dev (or use running dev server)
└── Verify: Health endpoint responds (GET /health → 200)

Step 2: Test the happy path
├── Make a real HTTP request to the endpoint
│   ├── Use the correct method (GET/POST/PUT/DELETE)
│   ├── Include proper headers (Content-Type, Authorization)
│   └── Send valid request body
├── Verify response:
│   ├── Status code matches API contract
│   ├── Response body matches expected schema
│   └── Response time < 200ms (P95 target)
└── Check server console for warnings/errors

Step 3: Test error paths
├── Invalid input → Verify 400 with Zod validation error
├── Missing auth → Verify 401
├── Not found → Verify 404
├── Duplicate → Verify 409
└── Check server console: no unhandled errors

Step 4: Verify database state
├── Query the database after the operation
├── Verify the record was created/updated/deleted correctly
├── Check foreign key relationships are intact
├── Verify no orphaned records
└── Check audit trail entries (if applicable)

Step 5: Record results
├── If ALL pass → Commit and continue
├── If ANY fail → Fix immediately (you have full context)
└── Document any unexpected behaviors for QA
```

### Example: Testing a User Creation Endpoint

```bash
# Step 1: Server is running on port 5001

# Step 2: Happy path
curl -X POST http://localhost:5001/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","password":"SecurePass123!"}'
# Expected: 201 with user object (no passwordHash)

# Step 3: Error paths
curl -X POST http://localhost:5001/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email"}'
# Expected: 400 with validation errors

# Step 4: Database verification
# Query: SELECT id, email, name FROM users WHERE email = 'test@example.com';
# Expected: One row with correct data
```

### When to Use

- After implementing each route handler
- After modifying business logic
- After database schema changes
- Before committing any backend code

---

## Frontend Development-Oriented Testing Tool

### What It Does

A browser verification protocol that Frontend Engineers use **during coding**. After implementing each component or page, the engineer immediately validates it by:

1. Launching the dev server
2. Navigating to the page/component in a browser
3. Monitoring the browser console for errors
4. Testing interactive elements
5. Checking visual rendering

### Protocol

```
For EACH page or major component implemented:

Step 1: Launch and navigate
├── Run: npm run dev
├── Open the page in a browser (or use Playwright headless)
└── Wait for full hydration (no loading spinners)

Step 2: Console monitoring
├── Open browser DevTools → Console tab
├── Check for:
│   ├── JavaScript errors (red)
│   ├── React hydration mismatches
│   ├── Failed network requests (4xx, 5xx)
│   ├── Missing asset 404s
│   └── Deprecation warnings
└── ZERO errors is the target

Step 3: Visual verification
├── All text readable (not truncated, not overlapping)
├── All buttons visible with proper styling
│   ├── Have background color (not transparent)
│   ├── Have visible border or shadow
│   └── Show hover state on mouse-over
├── All form inputs have visible borders
├── Layout matches spec (spacing, alignment)
├── Responsive: check at 1024px, 768px, 375px widths
└── Theme/colors load correctly

Step 4: Interaction testing
├── Click every button → verify it responds
│   ├── Navigation buttons → correct route
│   ├── Action buttons → API call fires
│   └── Toggle buttons → state changes visually
├── Fill every form field → verify it accepts input
├── Submit forms → verify success/error feedback
├── Test keyboard navigation (Tab, Enter, Escape)
└── Verify loading states appear during async operations

Step 5: Dynamic test case generation
├── Based on what you just built, identify:
│   ├── What could break with unexpected input?
│   ├── What happens at boundary conditions? (0 items, 1000 items)
│   ├── What if the API is slow or down?
│   └── What if the user navigates away mid-operation?
├── Test each case manually or via Playwright snippet
└── Fix any issues found immediately

Step 6: Record results
├── If ALL pass → Commit and continue
├── If visual issues → Fix immediately (CSS/Tailwind)
├── If interaction bugs → Fix immediately (event handlers)
└── Note any edge cases that need E2E tests for QA
```

### When to Use

- After implementing each new page
- After adding interactive components
- After modifying styling/layout
- After API integration
- Before committing any frontend code

---

## Integration with Existing Workflow

### During TDD Cycle

```
RED:   Write failing test
GREEN: Write minimal code → RUN DEV-TEST TOOL → Fix issues immediately
REFACTOR: Clean up → RUN DEV-TEST TOOL → Confirm nothing broke
COMMIT: Only after dev-test passes
```

### Handoff to QA

When the engineer hands work to QA, include dev-test results:

```markdown
## Dev-Test Results (from implementation)

### Backend
- Endpoints tested: 5/5 pass
- Error paths verified: 12/12 pass
- Database state verified: All FK relationships intact
- Server console: Zero errors

### Frontend
- Pages tested: 3/3 render correctly
- Console: Zero errors
- Interactions tested: All buttons, forms, navigation working
- Responsive: Verified at 1024px, 768px, 375px
- Edge cases noted for E2E: [list any found]
```

This gives QA a head start — they know the engineer already verified basic functionality, so they can focus on cross-cutting concerns, regression, and advanced edge cases.

---

## Metrics

Track in `.claude/memory/metrics/dev-test-metrics.json`:

```json
{
  "backend_dev_tests": {
    "total_runs": 0,
    "bugs_caught_during_dev": 0,
    "bugs_caught_at_qa_gate": 0,
    "average_fix_time_during_dev_seconds": 0,
    "average_fix_time_at_qa_gate_seconds": 0
  },
  "frontend_dev_tests": {
    "total_runs": 0,
    "console_errors_caught": 0,
    "visual_issues_caught": 0,
    "interaction_bugs_caught": 0
  }
}
```

**Target**: 80%+ of bugs caught during dev-test (not at QA gate).
