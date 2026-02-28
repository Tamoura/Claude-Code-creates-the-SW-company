# StableFlow Frontend Audit Report

**Audit Date**: 2026-02-28
**Auditor**: Code Reviewer Agent (Principal Architect + Security Engineer + Staff Backend Engineer)
**Scope**: `apps/web/src/` (68 source files) + `apps/merchant-demo/src/` (2 source files)
**Mode**: READ-ONLY -- no files modified

---

## Executive Summary

**Overall Assessment**: Fair (6.5/10)

The StableFlow frontend is a well-structured React 18 + TypeScript SPA with Tailwind CSS theming, wagmi wallet integration, and a clean component architecture. It demonstrates solid foundational engineering choices (code splitting, in-memory token storage, ErrorBoundary, custom hooks pattern). However, the codebase has significant issues in four areas: (1) accessibility gaps that would fail a WCAG 2.1 AA audit, (2) security concerns around mock mode data exposure and hardcoded credentials, (3) code quality problems including a 948-line god file and duplicated utility functions, and (4) architectural dead code from the prototype era that should be removed.

**Top 5 Risks**:
1. Mock API key exposed in DeveloperIntegration component (visible to all authenticated users)
2. Missing form labels on Security page password inputs -- fails WCAG 2.1 AA
3. `api-client.ts` is a 948-line god class mixing real API, mock implementation, and type definitions
4. `useAuth` hook uses module-level variable instead of React Context -- state is not synchronized across components
5. `useAnalytics` hook duplicates API calls due to competing useEffect hooks

**Recommendation**: Fix First -- address the P0 security and accessibility issues before any enterprise demo or production deployment.

---

## Metrics

| Metric | Value |
|--------|-------|
| Total frontend source files (non-test) | 70 |
| Total lines of code (non-test) | 10,743 |
| Dead/unreferenced files | 2 (`HomePage.tsx`, `PaymentPage.tsx`) |
| Components | 8 shared + 17 page components + 5 docs pages |
| Custom hooks | 11 |
| Library modules | 7 |
| Code splitting | Yes (React.lazy on all page routes) |
| Error boundary | Yes (class component wrapping entire app) |
| Accessibility score | 6/10 |
| Merchant demo files | 4 (separate Vite app on port 3105) |

---

## Critical Issues (Top 10)

### Issue #1: Mock API Key Displayed in UI

**Description**: The `DeveloperIntegration` component renders a mock API key `pk_live_51MzQ2...k9J2s` directly in the JSX. This string resembles a real Stripe-format publishable key. Even though it is mock data, it trains merchant users to treat key-like strings as safe to display, and if a real key were accidentally substituted, it would be visible to every authenticated user.

**File/Location**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/src/components/dashboard/DeveloperIntegration.tsx:38`

**Impact**:
- Severity: High
- Likelihood: Medium (mock mode only, but pattern is dangerous)
- Blast Radius: Product-wide

**Fix**: Replace the hardcoded mock key with a clearly fake placeholder like `sk_test_EXAMPLE_KEY_REPLACE_ME` and add a comment explaining it is for display purposes only. Better yet, fetch the real key from the API and mask all but the last 4 characters.

---

### Issue #2: Missing Visible Labels on Security Page Password Inputs

**Description**: The password change form on the Security page uses `aria-label` and `placeholder` text as the only labels for password inputs. There are no visible `<label>` elements. This fails WCAG 2.1 AA Success Criterion 1.3.1 (Info and Relationships) and 3.3.2 (Labels or Instructions). Screen reader users get labels, but sighted users who have difficulty reading low-contrast placeholder text cannot identify the fields.

**File/Location**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/src/pages/dashboard/Security.tsx:74-96`

**Impact**:
- Severity: High
- Likelihood: High (affects all sighted users on the security page)
- Blast Radius: Feature-specific

**Fix**: Add visible `<label>` elements with `htmlFor` attributes matching the input `id` attributes, following the pattern used in `Login.tsx` and `Signup.tsx`.

```tsx
// BEFORE (no visible label):
<input
  type="password"
  placeholder="Current password"
  aria-label="Current password"
  ...
/>

// AFTER (visible label):
<label htmlFor="current-password" className="block text-sm font-medium text-text-secondary mb-1">
  Current password
</label>
<input
  id="current-password"
  type="password"
  placeholder="Enter current password"
  ...
/>
```

---

### Issue #3: api-client.ts is a 948-line God File

**Description**: The API client file contains the `ApiClient` class, `ApiClientError` class, all mock implementations, all type/interface definitions, and every API endpoint method. At 948 lines, this violates Single Responsibility Principle and makes the codebase difficult to navigate, test, and maintain.

**File/Location**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/src/lib/api-client.ts` (948 lines)

**Impact**:
- Severity: Medium
- Likelihood: High (every new feature touches this file)
- Blast Radius: Product-wide

**Fix**: Split into separate modules:
- `api-client/types.ts` -- All interfaces and type definitions
- `api-client/errors.ts` -- ApiClientError class
- `api-client/mock-data.ts` -- Mock implementations and localStorage fallbacks
- `api-client/client.ts` -- Real ApiClient class
- `api-client/index.ts` -- Re-export barrel

---

### Issue #4: useAuth Hook Uses Module-Level State Instead of React Context

**Description**: The `useAuth` hook stores the current user in a module-level `storedUser` variable. This means that when one component calls `logout()`, other components using `useAuth()` will not re-render because they have their own independent `useState` that is not synchronized. The user state is effectively a singleton that can get out of sync across the component tree.

**File/Location**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/src/hooks/useAuth.tsx:11-15`

**Impact**:
- Severity: High
- Likelihood: Medium (logout inconsistency can leave UI in stale auth state)
- Blast Radius: Product-wide

**Fix**: Migrate to a proper React Context + Provider pattern:

```tsx
// Create AuthContext with Provider that wraps the app
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // ... login, logout, etc.
  return <AuthContext.Provider value={{ user, login, logout, ... }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

---

### Issue #5: useAnalytics Hook Duplicates API Calls

**Description**: The `useAnalytics` hook has three individual `useEffect` hooks (one each for overview, volume, and breakdown) AND a combined `loadAll` function that also fetches all three. When dependencies change, both the individual effects and the combined effect fire, resulting in 6 API calls instead of 3.

**File/Location**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/src/hooks/useAnalytics.ts`

**Impact**:
- Severity: Medium
- Likelihood: High (fires on every period/day/groupBy change)
- Blast Radius: Feature-specific (analytics page)

**Fix**: Remove the individual `useEffect` hooks and keep only the combined `loadAll` effect. Alternatively, use `@tanstack/react-query` which is already in the dependency tree and handles caching, deduplication, and cancellation automatically.

---

### Issue #6: TransactionsTable Has Redundant ARIA Table Semantics

**Description**: The `TransactionsTable` component wraps a native `<table>` element inside a `<div role="table">`. This creates a confusing double table structure for screen readers, as the `<table>` element already has implicit table semantics. The outer `role="table"` should be removed.

**File/Location**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/src/components/dashboard/TransactionsTable.tsx:70`

**Impact**:
- Severity: Medium
- Likelihood: High (all screen reader users hit this)
- Blast Radius: Product-wide (table used on multiple pages)

**Fix**: Remove `role="table"` from the wrapper div. The native `<table>` element provides correct semantics on its own.

---

### Issue #7: Terms of Service and Privacy Policy Links Are Dead (href="#")

**Description**: The Signup page contains two links for "Terms of Service" and "Privacy Policy" that both point to `href="#"`. These are non-functional links that violate WCAG 2.1 AA 2.4.4 (Link Purpose) and create a poor user experience. A user agreeing to terms they cannot read has legal implications.

**File/Location**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/src/pages/auth/Signup.tsx:196-202`

**Impact**:
- Severity: High
- Likelihood: High (every new user encounters this)
- Blast Radius: Product-wide (legal/compliance risk)

**Fix**: Create actual Terms of Service and Privacy Policy pages and link to them. At minimum, link to placeholder pages that acknowledge the content is pending.

---

### Issue #8: Duplicated formatCurrency Utility Functions

**Description**: The `formatCurrency` function is defined independently in at least 4 files: `lib/formatters.ts`, `pages/dashboard/Analytics.tsx`, `pages/dashboard/Invoices.tsx`, and `pages/dashboard/admin/MerchantsList.tsx`. Each implementation has slightly different formatting logic. The shared `formatters.ts` version is the canonical one but is not used consistently.

**File/Locations**:
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/src/lib/formatters.ts:7` (canonical)
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/src/pages/dashboard/Analytics.tsx:10` (redefined)
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/src/pages/dashboard/Invoices.tsx:15` (redefined)
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/src/pages/dashboard/admin/MerchantsList.tsx:5` (redefined)

**Impact**:
- Severity: Low
- Likelihood: High (inconsistent currency display across pages)
- Blast Radius: Product-wide

**Fix**: Remove all local definitions and import from `lib/formatters.ts`. Also deduplicate `formatDate` which has similar duplication across `MerchantsList.tsx`, `MerchantPayments.tsx`, and `PaymentsList.tsx`.

---

### Issue #9: Dead Code -- Legacy HomePage.tsx and PaymentPage.tsx

**Description**: `pages/HomePage.tsx` and `pages/PaymentPage.tsx` are not referenced in routing (App.tsx imports `HomePageNew` and `PaymentPageNew` instead). These legacy files are dead code that increases the codebase surface area and confuses developers.

**File/Locations**:
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/src/pages/HomePage.tsx`
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/src/pages/PaymentPage.tsx`

**Impact**:
- Severity: Low
- Likelihood: Low
- Blast Radius: N/A (no runtime impact)

**Fix**: Delete both files and their associated test files. If needed for reference, the git history preserves them.

---

### Issue #10: Merchant Demo Uses Inline Styles Instead of a Style System

**Description**: The entire `apps/merchant-demo/src/App.tsx` (290 lines) uses inline `style={{}}` objects for all styling. This makes the component hard to maintain, prevents theming consistency with the main app, and creates excessive inline style repetition.

**File/Location**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/merchant-demo/src/App.tsx:98-288`

**Impact**:
- Severity: Low
- Likelihood: Medium
- Blast Radius: Merchant demo only

**Fix**: Add Tailwind CSS to the merchant demo (it already uses Vite + React) and refactor to use Tailwind classes. This also enables sharing the design system with the main app.

---

## Accessibility Analysis (WCAG 2.1 AA)

### Accessibility Score: 6/10

### What Works Well

| Area | Evidence | Files |
|------|----------|-------|
| Skip-to-content links | Present in `PublicNav.tsx` (line 11) and `DashboardLayout.tsx` (line 28) with proper `id="main-content"` targets | `PublicNav.tsx`, `DashboardLayout.tsx`, `HomePageNew.tsx` |
| Form labels (most pages) | Login, Signup, CreatePaymentLink, Settings, ApiKeys, Webhooks all use proper `<label htmlFor>` patterns | `Login.tsx`, `Signup.tsx`, `CreatePaymentLink.tsx`, `Settings.tsx` |
| ARIA attributes on errors | `role="alert"` on error messages, `aria-invalid` on form inputs | `Login.tsx:51`, `Signup.tsx:86` |
| Decorative SVG handling | Consistent `aria-hidden="true"` on decorative icons across all pages | All pages with SVG icons |
| Mobile menu accessibility | `aria-expanded`, `aria-controls`, Escape key handler, auto-focus | `PublicNav.tsx:50-52` |
| Keyboard navigation | `focus-visible` outlines on sidebar links, tabIndex on table rows | `Sidebar.tsx`, `TransactionsTable.tsx` |
| Dark mode | Proper color contrast maintained via CSS custom properties | `index.css`, `App.css` |
| Language attribute | `lang="en"` on HTML root | `index.html:2` |

### Accessibility Failures

| Issue | WCAG Criterion | Severity | Location |
|-------|---------------|----------|----------|
| No visible labels on Security page password fields | 1.3.1, 3.3.2 | High | `Security.tsx:74-96` |
| Dead links (Terms, Privacy) on Signup | 2.4.4, 2.4.9 | High | `Signup.tsx:196-202` |
| Redundant `role="table"` on wrapper div | 1.3.1 | Medium | `TransactionsTable.tsx:70` |
| Missing `scope="col"` on some tables | 1.3.1 | Medium | `Invoices.tsx:69`, `Refunds.tsx:63`, `MerchantsList.tsx:99` |
| No focus trap in TopHeader dropdown | 2.4.3, 2.1.2 | Medium | `TopHeader.tsx:22-41` |
| No focus trap in mobile sidebar | 2.4.3, 2.1.2 | Medium | `DocsLayout.tsx:85-117` |
| StatCard trend indicator has no text alternative | 1.1.1 | Low | `StatCard.tsx:21-28` |
| Filter buttons lack `aria-pressed` for toggle state | 4.1.2 | Low | `PaymentsList.tsx:162`, `Refunds.tsx:36` |
| No `aria-live` region for filtered results count | 4.1.3 | Low | `PaymentsList.tsx:187` |
| MerchantsList search input lacks visible label | 1.3.1 | Medium | `MerchantsList.tsx:80-86` |
| Docs sidebar nav links use emoji as icon without `aria-hidden` | 1.1.1 | Low | `DocsLayout.tsx:112` |
| Color-only status indicators (no icon/pattern alternative) | 1.4.1 | Medium | Multiple status badges across pages |

### Focus Management Gaps

1. **TopHeader dropdown** (`TopHeader.tsx:22-41`): Click-outside closes dropdown, but there is no focus trap or Escape key handler. Tab can escape the dropdown boundary.
2. **Docs sidebar mobile overlay** (`DocsLayout.tsx:85-117`): No focus trap, no Escape handler, no return-focus on close.
3. **Delete confirmation flows** (`ApiKeys.tsx`, `Settings.tsx`): Inline confirmation UI appears but focus is not moved to the confirmation prompt.

---

## Security Analysis

### Authentication & Session Management

| Finding | Severity | Location | Notes |
|---------|----------|----------|-------|
| In-memory token storage (good) | N/A (positive) | `token-manager.ts` | Tokens stored in JS memory, not localStorage -- prevents XSS token theft |
| Mock signup has no password validation | Medium | `api-client.ts:mock signup` | When backend is unavailable, mock mode accepts any password |
| Login error logged to console | Low | `Login.tsx:25` | `console.error('Login failed:', err)` may leak error details in production |
| ProtectedRoute checks token existence only | Medium | `ProtectedRoute.tsx:7` | Checks `TokenManager.hasToken()` but does not validate token expiry or integrity |

### Data Exposure

| Finding | Severity | Location | Notes |
|---------|----------|----------|-------|
| Mock API key displayed in DeveloperIntegration | High | `DeveloperIntegration.tsx:38` | Looks like a real Stripe key format |
| Hardcoded devAddress in PaymentPageNew | Medium | `PaymentPageNew.tsx` | `0xdAC17F958D2ee523a2206206994597C13D831ec7` -- this is the real USDT contract address on mainnet, not a dev address |
| localStorage used extensively in mock mode | Medium | `api-client.ts`, `payments.ts` | Payment data, API keys, webhooks all stored in localStorage in mock mode |
| Merchant demo hardcodes default wallet address | Low | `merchant-demo/App.tsx:20` | Same USDT contract address as above |

### XSS / Injection

| Finding | Severity | Location | Notes |
|---------|----------|----------|-------|
| No `dangerouslySetInnerHTML` usage | N/A (positive) | Entire codebase | All content rendered via React JSX |
| CSP meta tag present | N/A (positive) | `index.html` | Content Security Policy defined in meta tag |
| User input reflected in UI without sanitization | Low | `PaymentsList.tsx:117-122` | Search query used in `.includes()` filter -- safe because not injected into HTML |

### CSRF

| Finding | Severity | Location | Notes |
|---------|----------|----------|-------|
| No CSRF token implementation | Medium | `api-client.ts` | API calls use Bearer token auth (JWT in Authorization header), which is naturally CSRF-resistant. However, cookie-based auth (refresh tokens) may need CSRF protection |

### Third-Party Dependencies

| Finding | Severity | Location | Notes |
|---------|----------|----------|-------|
| WalletConnect project ID validation | N/A (positive) | `wagmi-config.ts:22-44` | Gracefully handles missing/invalid project IDs |
| External links use `rel="noopener noreferrer"` | N/A (positive) | `CheckoutSuccess.tsx`, `PaymentDetail.tsx` | Prevents reverse tabnapping |

---

## Performance Analysis

### Code Splitting

**Status**: Good -- all page components use `React.lazy()` with `<Suspense>` fallback.

**File**: `App.tsx:7-28` -- 22 lazy-loaded page components.

### Identified Performance Issues

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| useAnalytics double-fetches all data | Medium | `useAnalytics.ts` | 6 API calls instead of 3 on every filter change |
| StatusPage polls every 3 seconds indefinitely | Low | `StatusPage.tsx` | No exponential backoff, no stop condition except terminal status |
| No image optimization | Low | N/A | No images used (SVG icons only) -- not a current issue |
| jsPDF + jspdf-autotable imported eagerly | Medium | `Invoices.tsx:3` | Large libraries loaded even if user never clicks "Download PDF"; should be dynamically imported |
| api-client.ts is not tree-shakeable | Medium | `api-client.ts` | Singleton export means the entire 948-line file is bundled even if only a few methods are used |
| wagmi/viem bundle size | Low | `wagmi-config.ts` | Heavy Web3 dependencies loaded on all payment pages; consider dynamic import for non-payment routes |

### Re-render Analysis

| Issue | Severity | Location | Notes |
|-------|----------|----------|-------|
| useDashboardData recomputes stats on every render | Low | `useDashboardData.ts` | `useMemo` is used correctly but `transactions` array reference changes on every fetch, invalidating memo |
| ThemeToggle re-renders parent unnecessarily | Low | `ThemeToggle.tsx` | Theme change triggers full page re-render via document class manipulation |

---

## Code Quality Analysis

### Component Structure

**Pattern**: Clean separation between pages, components, hooks, and lib modules. Pages are thin (rendering + composition), hooks handle data fetching, lib handles API communication.

**Positive patterns observed**:
- Consistent component file naming (PascalCase)
- TypeScript used throughout with explicit type annotations
- Consistent Tailwind utility class patterns
- Clear hook naming convention (`useXxx`)

### God Files / Oversized Modules

| File | Lines | Issue |
|------|-------|-------|
| `api-client.ts` | 948 | Contains class, error types, all mock data, all endpoint methods |
| `PaymentPageNew.tsx` | ~400+ | Complex wallet integration page mixing UI, wallet logic, SSE, and transaction processing |
| `merchant-demo/App.tsx` | 290 | Entire demo in one component with inline styles |

### State Management Issues

| Issue | Location | Notes |
|-------|----------|-------|
| Module-level user state in useAuth | `useAuth.tsx:11` | Not synchronized across component tree |
| No global state management | Entire app | Each page manages its own data fetching; no shared cache |
| @tanstack/react-query available but underused | `App.tsx` (provider present) | QueryClientProvider wraps app but most hooks use raw useState + useEffect |

### Error Handling

| Area | Status | Notes |
|------|--------|-------|
| ErrorBoundary | Present | Wraps entire app, catches render errors |
| API error handling | Good | ApiClientError class with status codes, all hooks have try/catch |
| Loading states | Good | All data-fetching pages show loading indicators |
| Empty states | Good | All list pages show "no data" messages |
| Network error handling | Partial | API calls catch errors but no offline indicator or retry UI |

### Code Duplication

| Duplicated Code | Locations | Fix |
|----------------|-----------|-----|
| `formatCurrency()` | `formatters.ts`, `Analytics.tsx`, `Invoices.tsx`, `MerchantsList.tsx`, `MerchantPayments.tsx` | Use shared import |
| `formatDate()` | `formatters.ts`, `PaymentsList.tsx`, `MerchantsList.tsx`, `MerchantPayments.tsx` | Use shared import |
| `StatusBadge` component | `PaymentDetail.tsx`, `TransactionsTable.tsx` | Extract to shared component |
| Status color mappings | `Refunds.tsx`, `MerchantPayments.tsx`, `MerchantsList.tsx`, `TransactionsTable.tsx` | Extract to shared constants |
| CSV export logic | `PaymentsList.tsx:65-92`, `invoice-pdf.ts:89-113` | Extract to shared utility |

---

## Frontend Architecture Assessment

### Architecture Pattern

The application follows a **Pages + Hooks + Lib** pattern:

```
App.tsx (Router)
  |-- Pages (thin UI components)
  |     |-- use custom hooks for data
  |     |-- render shared components
  |-- Components (reusable UI)
  |-- Hooks (data fetching + state)
  |     |-- call lib/api-client
  |-- Lib (API, utilities, wallet)
```

### Strengths

1. **Code splitting**: Every page is lazy-loaded, minimizing initial bundle
2. **Token security**: In-memory JWT storage is the correct approach
3. **Theming**: CSS custom properties enable clean light/dark mode without runtime overhead
4. **TypeScript coverage**: Full type safety across all modules
5. **Error boundaries**: Global error catching prevents white-screen-of-death
6. **Consistent design language**: Tailwind utility patterns are well-established
7. **SSE integration**: Real-time payment status updates with retry logic and token refresh

### Weaknesses

1. **No centralized state management**: Auth state uses a module-level hack; React Query is present but unused by most hooks
2. **God file**: `api-client.ts` at 948 lines is the most-imported module and the hardest to maintain
3. **Dead code**: Legacy files (`HomePage.tsx`, `PaymentPage.tsx`) remain in the tree
4. **Inconsistent patterns**: Some pages define local utility functions instead of using shared ones
5. **No form library**: Forms are manually managed with useState; no validation library (react-hook-form, zod, etc.)
6. **No error tracking**: No Sentry, LogRocket, or similar error monitoring integration
7. **No analytics/telemetry**: No usage tracking for product insights
8. **Mock mode tightly coupled**: Mock fallback logic is interleaved with real API code in the same file

### Architectural Risks

1. **Scaling concern**: As more dashboard pages are added, the pattern of each page having its own hook that independently fetches from the API will lead to waterfall requests and duplicated data fetching. Migrating to React Query (already available) would solve this.
2. **Testing complexity**: The ApiClient singleton and module-level auth state make unit testing difficult without module mocking.
3. **Bundle growth**: Web3 dependencies (wagmi, viem) are significant; they should be dynamically imported only on pages that need wallet functionality.

---

## Key UX / Accessibility Gaps

1. **No keyboard shortcut documentation** -- Power users have no way to discover shortcuts
2. **No breadcrumb navigation** in dashboard -- Deep pages like PaymentDetail have only a "Back" link
3. **No toast/notification system** -- Success/error messages are inline only, not globally visible
4. **No loading skeleton** -- Loading states show text-only "Loading..." instead of skeleton UI
5. **Color-only status indication** -- Status badges rely solely on color (green/yellow/red) with no icon or pattern alternative for color-blind users
6. **No 404 page** -- Navigating to an undefined route shows a blank page
7. **Insufficient color contrast verification** -- Custom CSS variables for text colors (e.g., `text-text-muted`) have not been verified against WCAG 4.5:1 contrast ratios in both light and dark modes

---

## Quick Wins (1-Day Fixes)

1. Add visible `<label>` elements to Security page password inputs
2. Remove `role="table"` from TransactionsTable wrapper div
3. Replace dead `href="#"` links on Signup page with placeholder routes
4. Delete dead files `HomePage.tsx` and `PaymentPage.tsx`
5. Replace all local `formatCurrency`/`formatDate` definitions with shared imports from `lib/formatters.ts`
6. Add `aria-pressed` to filter toggle buttons on PaymentsList and Refunds
7. Add `aria-live="polite"` to filtered results count display
8. Add `aria-hidden="true"` to emoji icons in DocsLayout sidebar
9. Move jsPDF import to dynamic `import()` in Invoices.tsx
10. Add Escape key handler to TopHeader dropdown

---

## 30-Day Remediation Roadmap

### Week 1: Security + Accessibility (P0)
- Fix all WCAG failures listed above (2 days)
- Remove/replace mock API key from DeveloperIntegration (1 hour)
- Add focus traps to dropdown menus and mobile overlays (1 day)
- Create Terms of Service and Privacy Policy pages (1 day)

### Week 2: Code Quality (P1)
- Split `api-client.ts` into 4-5 modules (2 days)
- Migrate `useAuth` to React Context pattern (1 day)
- Fix `useAnalytics` double-fetch issue (2 hours)
- Delete dead code files (1 hour)
- Consolidate duplicated utilities (2 hours)

### Week 3: Architecture (P1)
- Migrate data-fetching hooks to React Query (3 days)
- Dynamic import for jsPDF and wagmi on non-payment routes (1 day)
- Add a 404 route handler (1 hour)

### Week 4: UX Polish (P2)
- Add skeleton loading states (2 days)
- Add toast notification system (1 day)
- Add status icons alongside color indicators (1 day)
- Verify color contrast ratios in both themes (1 day)

---

## AI-Readiness Score: 6/10

| Dimension | Score | Notes |
|-----------|-------|-------|
| Modularity | 1.5/2 | Good page/hook/lib separation; god file and dead code reduce score |
| API Design | 1/2 | API client is well-typed but monolithic; mock/real coupling hurts testability |
| Testability | 1/2 | Module-level state and singleton pattern make isolated testing difficult |
| Observability | 0.5/2 | No error tracking, no analytics, no performance monitoring |
| Documentation | 2/2 | Component doc comments, clear naming, type definitions throughout |

---

*Report generated by Code Reviewer Agent. This is a read-only audit -- no files were modified.*
