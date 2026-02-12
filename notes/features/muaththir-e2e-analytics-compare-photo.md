# Muaththir E2E Tests: Analytics, Compare, and Photo Upload

## Branch
feature/muaththir/production-polish

## What was added
Three new E2E test files in `products/muaththir/e2e/tests/`:

### 1. analytics-flow.spec.ts (8 tests)
- Page loads with "Observation Analytics" heading
- Summary stat cards (total observations, most active dimension, dimensions covered)
- Observation-by-dimension bar chart with data-testid bars
- Sentiment distribution section (positive/neutral/needs attention)
- Child selector shown with multiple children
- Empty state when no observations
- No-children state redirects to onboarding

### 2. compare-flow.spec.ts (7 tests)
- Page loads with "Compare Children" heading (needs 2+ children)
- Child selector chips shown for each child
- Comparison grid with radar chart cards for each child
- Overall scores displayed per child
- Dimension breakdown table with 6 rows
- Deselecting a child hides comparison grid
- One-child state shows "need two children" message
- No-children state shows add-child prompt

### 3. observation-photo-flow.spec.ts (5 tests)
- Photo attach button visible on observe page
- Photo hint text displayed
- Selecting a photo via file input shows preview
- Remove button restores attach button
- Full form submission with photo context

## Patterns followed
- Authentication via UI login (not page.goto for authed pages)
- Sidebar navigation with `force: true` click
- All API routes mocked (children, dashboard, observations)
- Generous timeouts (15000ms) for CI
- Mock data consistent with existing test patterns (MOCK_CHILD, MOCK_CHILD_2)
- `data-testid` attributes used where available in components

## API endpoints mocked
- `**/api/auth/login` - Login
- `**/api/children?**` and `**/api/children` - Children list
- `**/api/children/*/observations**` - Observations list (analytics)
- `**/api/children/*/observations` - Observation creation (photo flow)
- `**/api/dashboard/child-*` - Dashboard data
- `**/api/dashboard/*/recent` - Recent observations
- `**/api/dashboard/*/milestones-due` - Milestones due
