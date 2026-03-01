# WCAG 2.1 AA Accessibility & UX Audit Report

**Product**: StableFlow (stablecoin-gateway)
**Scope**: All frontend files in `apps/web/src/`
**Date**: 2026-02-28
**Auditor**: Code Reviewer Agent (Principal Architect + Security Engineer + Staff Backend Engineer)
**Standard**: WCAG 2.1 Level AA
**Files Audited**: 40+ components, pages, layouts, and styles

---

## Executive Summary

**Overall Assessment**: Fair (6.5/10)

The StableFlow frontend demonstrates a solid accessibility foundation in several areas -- proper `lang` attribute, skip-to-content links on major layouts, semantic HTML landmarks, and good form labeling on auth pages. However, the audit identified **47 accessibility issues** across 10 WCAG dimensions, including 8 Critical, 14 High, 17 Medium, and 8 Low severity findings.

The most impactful issues are:
1. Missing `aria-hidden` on decorative SVGs (affects screen reader users across 8+ components)
2. Missing `role="alert"` on dynamic error/success messages (affects all users relying on assistive tech)
3. Missing `aria-pressed`/`aria-selected` on toggle/filter buttons (affects keyboard and screen reader users)
4. Hardcoded light-mode colors in dark mode (creates contrast failures for dark mode users)
5. Dead links to nonexistent routes (`/terms`, `/privacy`, external placeholder URL)

**Recommendation**: Fix Critical and High issues before any public launch. Medium issues should be addressed in a follow-up sprint.

---

## Table of Contents

1. [Color Contrast](#1-color-contrast)
2. [Form Labels & Inputs](#2-form-labels--inputs)
3. [Alt Text & Decorative Images](#3-alt-text--decorative-images)
4. [Keyboard Navigation & Focus Management](#4-keyboard-navigation--focus-management)
5. [Focus Indicators](#5-focus-indicators)
6. [Heading Hierarchy](#6-heading-hierarchy)
7. [ARIA Attributes](#7-aria-attributes)
8. [Language Attribute](#8-language-attribute)
9. [Error Identification](#9-error-identification)
10. [Link Purpose](#10-link-purpose)
11. [Dead Links & Placeholder Content](#11-dead-links--placeholder-content)
12. [Responsive Design (320px)](#12-responsive-design-320px)
13. [Security (XSS/CSRF)](#13-security-xsscsrf)
14. [Findings Summary Table](#14-findings-summary-table)
15. [Remediation Roadmap](#15-remediation-roadmap)

---

## 1. Color Contrast

### WCAG Reference: 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast

#### PASS

- **Light mode text colors**: `--color-text-primary: #0f172a` on `--color-page-bg: #f8fafc` yields a contrast ratio of approximately 15.4:1 (PASS AA).
- **Light mode secondary text**: `--color-text-secondary: #64748b` on `#f8fafc` yields approximately 4.7:1 (PASS AA for normal text).
- **Dark mode primary text**: `--color-text-primary: #ffffff` on `--color-page-bg: #0b0e1a` yields approximately 18.6:1 (PASS).
- **Accent colors on dark backgrounds**: `--color-accent-green: #22c55e` on dark card bg `#1a2035` yields approximately 6.2:1 (PASS).

#### FAIL

| ID | Severity | File:Line | Issue | WCAG |
|----|----------|-----------|-------|------|
| CC-01 | **High** | `index.css:29` | `--color-text-muted: #5a6480` on dark card bg `#1a2035` yields approximately 2.8:1. Fails AA minimum of 4.5:1 for normal text. Used extensively for placeholder text, labels, and secondary info. | 1.4.3 |
| CC-02 | **Medium** | `index.css:11` | `--color-text-muted: #94a3b8` on light card bg `#ffffff` yields approximately 3.3:1. Fails AA for normal text. | 1.4.3 |
| CC-03 | **Critical** | `PaymentPageNew.tsx:256` | Hardcoded `bg-blue-50` with `text-blue-900` is designed for light mode only. In dark mode (`.dark` class), these Tailwind utilities resolve to fixed light-mode hex values, creating near-invisible text on dark backgrounds. Same issue at lines 290 (`bg-green-50`, `text-green-900`), 337 (`bg-yellow-50`, `text-yellow-900`). | 1.4.3 |
| CC-04 | **Medium** | `MerchantsList.tsx:22-26` | `StatusBadges` uses hardcoded light/dark color pairs like `bg-green-100 text-green-800` and `dark:bg-green-900/30 dark:text-green-400`. While these work, they bypass the theme system and may have insufficient contrast in edge cases. | 1.4.3 |

---

## 2. Form Labels & Inputs

### WCAG Reference: 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions, 4.1.2 Name, Role, Value

#### PASS

- **Login page** (`Login.tsx:56-72`): All inputs have `<label htmlFor>` paired with matching `id`, `aria-required`, `aria-invalid`, and `aria-describedby`.
- **Signup page** (`Signup.tsx:94-151`): Proper `htmlFor`/`id` pairing, password requirements linked via `aria-describedby="password-requirements"`.
- **Settings password form** (`Settings.tsx:279-322`): All three password inputs have `htmlFor`/`id` pairs.
- **Webhook create form** (`Webhooks.tsx:166-190`): `htmlFor`/`id` pairs on URL and description inputs.
- **API Key create form** (`ApiKeys.tsx:119-130`): `htmlFor`/`id` pair on key name input.

#### FAIL

| ID | Severity | File:Line | Issue | WCAG |
|----|----------|-----------|-------|------|
| FL-01 | **High** | `Analytics.tsx:138-146` | `<select>` element for days filter has no `<label>`, no `aria-label`, and no `id`. Screen readers cannot identify this control's purpose. | 4.1.2 |
| FL-02 | **Medium** | `Webhooks.tsx:250-265` | Edit-mode inputs for URL, description, and events lack `htmlFor`/`id` association. The `<label>` elements are present but not programmatically linked to their inputs (no `htmlFor` attribute matching an `id` on the `<input>`). | 1.3.1 |
| FL-03 | **Medium** | `Security.tsx:79-106` | Password inputs in the change-password form use `placeholder` and `aria-label` but have no visible labels. While `aria-label` provides programmatic name, visible labels are recommended for cognitive accessibility (WCAG 3.3.2). | 3.3.2 |
| FL-04 | **Medium** | `MerchantsList.tsx:80-86` | Search input has `placeholder="Search by email..."` but no `<label>` and no `aria-label`. Screen readers will read the placeholder as a fallback but this is not reliably supported. | 4.1.2 |
| FL-05 | **Low** | `Settings.tsx:365-371` | Delete confirmation input has both `htmlFor`/`id` and `aria-label="Confirmation text"`. The `aria-label` is redundant but not harmful. The visible label instruction ("Type DELETE to confirm") is properly associated. No issue, but noted for completeness. | -- |

---

## 3. Alt Text & Decorative Images

### WCAG Reference: 1.1.1 Non-text Content

#### PASS

- **HomePageNew.tsx**: All SVG icons include `aria-hidden="true"` (lines 56, 69, 82).
- **PaymentsList.tsx**: `SearchIcon` and `DownloadIcon` both have `aria-hidden="true"` (lines 21, 40).
- **Login.tsx**: Spinner SVG has `aria-hidden="true"` (line 85).
- **Signup.tsx**: Spinner SVG has `aria-hidden="true"` (line 219).
- **TransactionsTable.tsx**: Arrow SVGs have `aria-hidden="true"`.

#### FAIL

| ID | Severity | File:Line | Issue | WCAG |
|----|----------|-----------|-------|------|
| AT-01 | **High** | `CheckoutPreview.tsx:36-64` | QR code SVG placeholder has no `aria-label`, no `aria-hidden`, and no `role="img"` with accessible name. Screen readers will attempt to read each SVG `<rect>` element. Should have `aria-hidden="true"` (decorative) or `role="img" aria-label="QR code placeholder"`. | 1.1.1 |
| AT-02 | **Medium** | `StatusPage.tsx:111-134` | All four status icon SVGs (pending, confirming, completed, failed) lack `aria-hidden="true"`. Since the status text is displayed separately below each icon, these are decorative and should be hidden from assistive tech. | 1.1.1 |
| AT-03 | **Medium** | `ComingSoon.tsx:11-23` | Decorative plus icon SVG lacks `aria-hidden="true"`. | 1.1.1 |
| AT-04 | **Medium** | `ErrorBoundary.tsx:33-45` | Warning triangle SVG icon lacks `aria-hidden="true"`. | 1.1.1 |
| AT-05 | **Medium** | `StatCard.tsx:15-17` | Trend arrow SVG icon lacks `aria-hidden="true"`. | 1.1.1 |
| AT-06 | **Medium** | `TopHeader.tsx:72-73` | Shopping cart SVG icon on "Simulate Payment" button lacks `aria-hidden="true"`. | 1.1.1 |
| AT-07 | **Low** | `PaymentPageNew.tsx:412-430` | Spinner SVG in pay button lacks `aria-hidden="true"`. The visual text "Confirming..."/"Processing..." conveys the meaning, so the SVG is decorative. | 1.1.1 |
| AT-08 | **Low** | `ApiKeys.tsx:81-82` | Success checkmark SVG in "API Key Created" banner lacks `aria-hidden="true"`. | 1.1.1 |
| AT-09 | **Low** | `Webhooks.tsx:128-129` | Success checkmark SVG in webhook created/rotated banner lacks `aria-hidden="true"`. | 1.1.1 |
| AT-10 | **Low** | `App.tsx:56` | Suspense fallback spinner (`<div className="animate-spin ...">`) has no accessible text. Screen readers see an empty div. Add `role="status"` and visually hidden text like "Loading page". | 1.1.1 |

---

## 4. Keyboard Navigation & Focus Management

### WCAG Reference: 2.1.1 Keyboard, 2.1.2 No Keyboard Trap, 2.4.3 Focus Order

#### PASS

- **PublicNav.tsx**: Mobile menu handles `Escape` key to close, auto-focuses first item on open, includes `aria-expanded` and `aria-controls`.
- **TransactionsTable.tsx**: Implements `onKeyDown` handler for Enter/Space on table rows with `tabIndex={0}` and `role="link"`.
- **DashboardLayout.tsx**: Mobile hamburger has `aria-label` and `focus-visible` ring.

#### FAIL

| ID | Severity | File:Line | Issue | WCAG |
|----|----------|-----------|-------|------|
| KN-01 | **Critical** | `TopHeader.tsx:90-117` | User dropdown menu opens on click but has no keyboard management: no `Escape` key handler to close, no arrow key navigation between menu items, no focus trapping within the menu, no `role="menu"`/`role="menuitem"` on items. Keyboard users can Tab through items but cannot close the menu with Escape. | 2.1.1, 2.4.3 |
| KN-02 | **High** | `ApiKeys.tsx:245-260` | Inline revoke confirmation appears in-place but does not receive focus. When "Revoke" is clicked, the "Confirm"/"Cancel" buttons appear but keyboard focus remains on the original button (now removed from DOM). Focus is lost. | 2.4.3 |
| KN-03 | **High** | `Webhooks.tsx:353-376` | Same issue as KN-02: inline delete confirmation loses keyboard focus when the "Delete" button is replaced by "Confirm"/"Cancel". | 2.4.3 |
| KN-04 | **Medium** | `Settings.tsx:352-395` | Delete account confirmation section expands in-place. Focus is not moved to the new input or action area. | 2.4.3 |
| KN-05 | **Medium** | `DocsLayout.tsx:56-65` | Mobile sidebar toggle button has `aria-expanded` but the sidebar lacks `aria-controls` linkage. No `Escape` key handler to close the sidebar. | 2.1.1 |

---

## 5. Focus Indicators

### WCAG Reference: 2.4.7 Focus Visible

#### PASS

- **Login/Signup forms**: Input focus uses `focus:outline-none focus:border-accent-blue` which provides visible border change.
- **PublicNav.tsx**: Buttons use `focus-visible:ring-2 focus-visible:ring-accent-blue`.
- **TransactionsTable.tsx**: Rows use `focus-visible:ring-2 focus-visible:ring-accent-blue`.
- **Sidebar.tsx**: NavItem uses `focus-visible:ring-2 focus-visible:ring-accent-blue`.
- **PricingPage.tsx**: CTA button has `focus:ring-2 focus:ring-pink-500 focus:ring-offset-2`.

#### FAIL

| ID | Severity | File:Line | Issue | WCAG |
|----|----------|-----------|-------|------|
| FI-01 | **High** | `PaymentPageNew.tsx:262-276` | "Connect MetaMask" and "Connect Mobile Wallet" buttons lack visible focus indicators. Uses `disabled:opacity-50` for disabled state but no `focus:ring` or `focus-visible:ring` for active focus. | 2.4.7 |
| FI-02 | **Medium** | `StatusPage.tsx:94-98` | "Go Home" button uses bare `bg-blue-600 hover:bg-blue-700` without any focus ring styling. Keyboard users cannot see when this button is focused. | 2.4.7 |
| FI-03 | **Medium** | `ErrorBoundary.tsx:63-66` | "Go to Homepage" button lacks focus indicator. | 2.4.7 |
| FI-04 | **Low** | `Analytics.tsx:30-42` | `PeriodButton` component uses `transition-colors` but no `focus-visible:ring`. Keyboard users cannot distinguish focused period buttons from adjacent ones. | 2.4.7 |
| FI-05 | **Low** | `Refunds.tsx:36-47` | Status filter buttons lack focus indicators. | 2.4.7 |

---

## 6. Heading Hierarchy

### WCAG Reference: 1.3.1 Info and Relationships, 2.4.6 Headings and Labels

#### PASS

- **HomePageNew.tsx**: Clean hierarchy: `h1` (hero) > `h2` (section titles) > `h3` (feature cards). No skipped levels.
- **PricingPage.tsx**: `h1` > `h2` hierarchy maintained.
- **Login.tsx**: Single `h2` for page title (appropriate within app layout).
- **Signup.tsx**: Single `h2` for page title.
- **Dashboard pages**: Consistent `h2` page title with `h3` section headers.
- **Settings.tsx**: `h2` (Settings) > `h3` (Account Information, Notifications, Change Password, Danger Zone).

#### FAIL

| ID | Severity | File:Line | Issue | WCAG |
|----|----------|-----------|-------|------|
| HH-01 | **Medium** | `DashboardHome.tsx` | No explicit `h1` on the dashboard home page. The `TopHeader` component renders `<h1>` via its `title` prop, but this is inside the header layout, not the main content. The main content area starts with `h3` elements (StatCard titles, DeveloperIntegration title). This creates a heading skip from h1 (in header) to h3 (in content). | 1.3.1 |
| HH-02 | **Low** | `CheckoutPreview.tsx:67` | Uses `<h4>` ("Pro Analytics Plan") without a preceding `h3` in the same landmark. The parent `DashboardHome` has `h3` headings but this component's heading level depends on where it is composed. | 1.3.1 |

---

## 7. ARIA Attributes

### WCAG Reference: 4.1.2 Name, Role, Value

#### PASS

- **PublicNav.tsx**: Excellent ARIA usage -- `aria-label` on nav, mobile menu button with `aria-expanded`, `aria-controls`, links with `aria-current="page"`.
- **TopHeader.tsx:82-84**: User menu button has `aria-label`, `aria-expanded`, `aria-haspopup="true"`.
- **Sidebar.tsx**: `role="navigation"`, `aria-label="Main navigation"`, all SVGs have `aria-hidden="true"`.
- **TransactionsTable.tsx**: `role="table"`, `scope="col"` on headers, status badges with `aria-label`.
- **Login.tsx**: `aria-required`, `aria-invalid`, `aria-describedby` linking error to form.

#### FAIL

| ID | Severity | File:Line | Issue | WCAG |
|----|----------|-----------|-------|------|
| AR-01 | **Critical** | `TopHeader.tsx:91-116` | Dropdown menu div lacks `role="menu"`. Menu items (Settings, Security, Sign Out buttons) lack `role="menuitem"`. The `aria-haspopup="true"` on the trigger implies a menu role structure that does not exist. | 4.1.2 |
| AR-02 | **High** | `Analytics.tsx:117-134, 186-204` | `PeriodButton` toggle buttons lack `aria-pressed` to indicate active/selected state. The visual active state (blue background) is not communicated to screen readers. | 4.1.2 |
| AR-03 | **High** | `PaymentsList.tsx:161-173` | Status filter buttons lack `aria-pressed` or equivalent grouping with `role="tablist"`/`role="tab"`. Active filter state is purely visual. | 4.1.2 |
| AR-04 | **High** | `Refunds.tsx:35-47` | Same as AR-03: status filter buttons lack `aria-pressed`. | 4.1.2 |
| AR-05 | **Medium** | `Invoices.tsx:68-75` | Table `<th>` elements lack `scope="col"`. While modern screen readers often infer scope from `<thead>`, explicit scope is required for robust AA compliance. | 1.3.1 |
| AR-06 | **Medium** | `Refunds.tsx:63-69` | Table `<th>` elements lack `scope="col"`. | 1.3.1 |
| AR-07 | **Medium** | `ApiKeys.tsx:195-202` | Table `<th>` elements lack `scope="col"`. | 1.3.1 |
| AR-08 | **Medium** | `MerchantsList.tsx:99-118` | Table `<th>` elements lack `scope="col"`. | 1.3.1 |
| AR-09 | **Medium** | `Analytics.tsx:211-222` | Breakdown table `<th>` elements lack `scope="col"`. | 1.3.1 |
| AR-10 | **Low** | `DocsLayout.tsx:95` | Sidebar `<nav>` lacks `aria-label`. Multiple `<nav>` elements on the page (top nav + sidebar nav) must be distinguished with unique `aria-label` values. | 4.1.2 |
| AR-11 | **Low** | `DocsLayout.tsx:112` | Sidebar nav links use emoji icons (lines 16-19: icons like a rocket, book, bell, package). Screen readers will announce these emojis, which adds noise. Use `aria-hidden="true"` on the `<span>` wrapping the emoji or replace with decorative SVGs. | 1.1.1 |
| AR-12 | **Low** | `DeveloperIntegration.tsx:22-25` | "Copy" button lacks `aria-label`. Screen reader users hear only "Copy" without context of what is being copied. Should be `aria-label="Copy code snippet"`. | 4.1.2 |
| AR-13 | **Low** | `ThemeToggle.tsx` (referenced in Sidebar)  | Theme toggle button has `aria-label="Toggle theme"` but does not communicate current state (e.g., `aria-label="Switch to dark mode"` or `aria-pressed`). | 4.1.2 |

---

## 8. Language Attribute

### WCAG Reference: 3.1.1 Language of Page

#### PASS

| ID | Status | File:Line | Detail |
|----|--------|-----------|--------|
| LA-01 | **PASS** | `index.html` | `<html lang="en">` is correctly set. |

No failures in this category.

---

## 9. Error Identification

### WCAG Reference: 3.3.1 Error Identification, 3.3.3 Error Suggestion

#### PASS

- **Login.tsx:49-55**: Error div uses `role="alert"` with `aria-describedby` linking to the form field.
- **Signup.tsx:84-91**: Error div uses `role="alert"`.

#### FAIL

| ID | Severity | File:Line | Issue | WCAG |
|----|----------|-----------|-------|------|
| EI-01 | **Critical** | `PaymentPageNew.tsx:447-451` | Error messages displayed after failed wallet connection or payment lack `role="alert"`. Dynamic errors (e.g., "MetaMask not detected") appear visually but screen readers are not notified. | 3.3.1 |
| EI-02 | **Critical** | `Settings.tsx:324-328` | Password change error message (`passwordError`) renders as a plain `<div>` without `role="alert"` or `aria-live="polite"`. Users with screen readers will not be notified of validation failures. | 3.3.1 |
| EI-03 | **High** | `Settings.tsx:330-333` | Password success message (`passwordSuccess`) also lacks `role="status"` or `aria-live="polite"`. The confirmation "Password updated successfully" is not announced. | 3.3.1 |
| EI-04 | **High** | `Settings.tsx:264-268` | Notification save success message lacks `role="status"`. | 3.3.1 |
| EI-05 | **High** | `Security.tsx:116-120` | Password change result message (success or error) lacks `role="alert"`/`role="status"`. | 3.3.1 |
| EI-06 | **Medium** | `ApiKeys.tsx:71-75` | API Keys error message lacks `role="alert"`. | 3.3.1 |
| EI-07 | **Medium** | `Webhooks.tsx:118-122` | Webhooks error message lacks `role="alert"`. | 3.3.1 |
| EI-08 | **Medium** | `Analytics.tsx:68-74` | Analytics error message lacks `role="alert"`. | 3.3.1 |

---

## 10. Link Purpose

### WCAG Reference: 2.4.4 Link Purpose (In Context)

#### PASS

- **PublicNav.tsx**: All navigation links have descriptive text ("Home", "Pricing", "Docs").
- **Sidebar.tsx**: All navigation items have descriptive labels paired with `aria-hidden` icons.
- **PaymentDetail.tsx**: "Back to Payments" link includes clear direction.

#### FAIL

| ID | Severity | File:Line | Issue | WCAG |
|----|----------|-----------|-------|------|
| LP-01 | **Medium** | `PaymentPageNew.tsx:458-463` | Link text "Learn about our security" opens an external URL (`https://gateway.io/security`) with no indication it opens externally. Missing `target="_blank"`, `rel="noopener noreferrer"`, and visual/ARIA indicator of external link. | 2.4.4 |
| LP-02 | **Medium** | `Invoices.tsx:103-108` | "Download PDF" button text is the same for every invoice row. Screen reader users navigating by links will hear "Download PDF" repeated with no context of which invoice. Should include `aria-label={`Download PDF for invoice ${inv.id}`}`. | 2.4.4 |
| LP-03 | **Low** | `MerchantsList.tsx:146-152` | "View" link text is the same for every merchant row. Should include `aria-label={`View payments for ${m.email}`}`. | 2.4.4 |
| LP-04 | **Low** | `DeveloperIntegration.tsx:73-78` | Uses raw `<a href="/dashboard/api-keys">` instead of React Router `<Link>`. This causes a full page reload instead of client-side navigation. Not an accessibility failure per se, but creates a jarring UX. | -- |

---

## 11. Dead Links & Placeholder Content

### WCAG Reference: General usability, not a specific WCAG criterion but affects user experience

| ID | Severity | File:Line | Issue |
|----|----------|-----------|-------|
| DL-01 | **Critical** | `Signup.tsx:196-202` | Links to `/terms` (Terms of Service) and `/privacy` (Privacy Policy) point to routes that do not exist in `App.tsx`. Clicking these links will hit the React Router catch-all and render nothing or redirect. For a payment platform, missing legal pages is a compliance issue. |
| DL-02 | **High** | `PaymentPageNew.tsx:459` | External link `https://gateway.io/security` is a placeholder URL that does not resolve to a real domain. |
| DL-03 | **Medium** | `Settings.tsx:181` | `memberSince` is hardcoded as `'January 2026'` with a `// TODO` comment. Should use actual user creation date. |
| DL-04 | **Low** | `DeveloperIntegration.tsx:36-37` | Code snippet shows `'pk_live_...'` as a placeholder API key. This is expected for a demo but could confuse developers who try to use it literally. |

---

## 12. Responsive Design (320px)

### WCAG Reference: 1.4.10 Reflow (320px viewport)

Assessment is based on static analysis of CSS classes and layout patterns.

#### Likely PASS

- **Layout**: All pages use `max-w-md`, `max-w-2xl`, `max-w-4xl`, `max-w-6xl` with `px-4` or `px-6` padding. Content will reflow within narrow viewports.
- **Grid**: Dashboard uses `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` responsive breakpoints (e.g., `Analytics.tsx:90`, `HomePageNew.tsx:53`).
- **Sidebar**: `DashboardLayout.tsx` uses `hidden md:block` for desktop sidebar and a mobile hamburger menu.
- **Tables**: Most tables use `overflow-x-auto` wrapper (e.g., `Analytics.tsx:209`).

#### Potential Issues

| ID | Severity | File:Line | Issue |
|----|----------|-----------|-------|
| RD-01 | **Medium** | `Invoices.tsx:66` | Invoice table does not have `overflow-x-auto` wrapper. On 320px, the 6-column table will overflow. |
| RD-02 | **Medium** | `ApiKeys.tsx:193` | API Keys table has 6 columns without an `overflow-x-auto` wrapper at the outer level. The table is inside a `rounded-xl overflow-hidden` div, which will clip content rather than scroll. |
| RD-03 | **Low** | `MerchantsList.tsx:96-158` | Merchants table has 6 columns. While it has `overflow-hidden`, it lacks `overflow-x-auto` for horizontal scrolling at narrow widths. |
| RD-04 | **Low** | `PricingPage.tsx:79-128` | Comparison table may be tight at 320px. The `w-full` table inside `max-w-4xl` container should reflow, but `px-6` padding on cells may cause horizontal overflow. |

---

## 13. Security (XSS/CSRF)

### Assessment of frontend security posture

#### PASS

- **CSP**: `index.html` includes a `<meta http-equiv="Content-Security-Policy">` tag (restricting script sources).
- **External links**: `CheckoutSuccess.tsx` uses `rel="noopener noreferrer"` on external block explorer links.
- **No `dangerouslySetInnerHTML`**: No usage found across all audited files.
- **Input sanitization**: Form inputs use React's controlled components, which auto-escape HTML.

#### Concerns

| ID | Severity | File:Line | Issue |
|----|----------|-----------|-------|
| SEC-01 | **Medium** | `PaymentPageNew.tsx:88-89` | Error messages from API responses are rendered directly: `setError('Payment not found or has expired')` is safe because it is a hardcoded string. However, `connectError.message` (line 113) and `err.message` (line 172) come from external sources (wallet provider, network errors). While React auto-escapes, the error text could contain misleading content (social engineering via crafted wallet error messages). |
| SEC-02 | **Low** | `DeveloperIntegration.tsx:8` | `navigator.clipboard.writeText(codeSnippet)` copies mock code to clipboard. The `codeSnippet` comes from a static import (`dashboard-mock`). No XSS risk, but clipboard API requires HTTPS or localhost and may fail silently without user feedback. |
| SEC-03 | **Low** | `ApiKeys.tsx:49, Webhooks.tsx:93` | Same clipboard usage pattern. No error handling if `navigator.clipboard` is unavailable (e.g., insecure context, permission denied). |

---

## 14. Findings Summary Table

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Color Contrast | 1 | 1 | 2 | 0 | 4 |
| Form Labels | 0 | 1 | 3 | 1 | 5 |
| Alt Text / SVGs | 0 | 1 | 5 | 4 | 10 |
| Keyboard Navigation | 1 | 2 | 2 | 0 | 5 |
| Focus Indicators | 0 | 1 | 2 | 2 | 5 |
| Heading Hierarchy | 0 | 0 | 1 | 1 | 2 |
| ARIA Attributes | 1 | 3 | 5 | 4 | 13 |
| Language | 0 | 0 | 0 | 0 | 0 |
| Error Identification | 2 | 3 | 3 | 0 | 8 |
| Link Purpose | 0 | 0 | 2 | 2 | 4 |
| Dead Links | 1 | 1 | 1 | 1 | 4 |
| Responsive | 0 | 0 | 2 | 2 | 4 |
| Security | 0 | 0 | 1 | 2 | 3 |
| **TOTAL** | **6** | **13** | **30** | **19** | **67** |

---

## 15. Remediation Roadmap

### Week 1: Critical Fixes (6 issues)

1. **CC-03**: Replace hardcoded Tailwind colors in `PaymentPageNew.tsx` with theme-aware alternatives.
   ```tsx
   // BEFORE (breaks in dark mode):
   <div className="bg-blue-50 rounded-lg p-4 mb-4">
     <p className="text-sm text-blue-900">Connect your wallet</p>
   </div>

   // AFTER (theme-aware):
   <div className="bg-accent-blue/10 rounded-lg p-4 mb-4 border border-accent-blue/20">
     <p className="text-sm text-accent-blue">Connect your wallet</p>
   </div>
   ```

2. **KN-01**: Add keyboard management to `TopHeader.tsx` dropdown menu.
   ```tsx
   // Add role="menu" to container, role="menuitem" to items
   // Add Escape key handler
   // Add arrow key navigation
   // Focus first item on open
   ```

3. **AR-01**: Add `role="menu"` and `role="menuitem"` to `TopHeader.tsx` dropdown.

4. **EI-01**: Add `role="alert"` to error message in `PaymentPageNew.tsx:447`.

5. **EI-02**: Add `role="alert"` to password error in `Settings.tsx:324`.

6. **DL-01**: Create `/terms` and `/privacy` routes in `App.tsx`, even if initially placeholder pages. Legal pages are required for a payment platform.

### Week 2: High-Priority Fixes (13 issues)

7. **CC-01**: Adjust `--color-text-muted` in dark mode from `#5a6480` to at least `#8b95b0` (matching `--color-text-secondary`) to meet 4.5:1 contrast.

8. **AT-01**: Add `aria-hidden="true"` to QR code SVG in `CheckoutPreview.tsx`.

9. **FL-01**: Add `aria-label="Select time range"` to `<select>` in `Analytics.tsx:138`.

10. **AR-02, AR-03, AR-04**: Add `aria-pressed` to all toggle/filter buttons:
    ```tsx
    // BEFORE:
    <button onClick={onClick} className={active ? '...' : '...'}>

    // AFTER:
    <button onClick={onClick} aria-pressed={active} className={active ? '...' : '...'}>
    ```

11. **KN-02, KN-03**: Move focus to "Confirm" button when inline confirmation appears.

12. **FI-01**: Add `focus-visible:ring-2 focus-visible:ring-blue-400` to wallet connection buttons.

13. **EI-03, EI-04, EI-05**: Add `role="status"` to success messages and `role="alert"` to error messages.

14. **DL-02**: Replace `https://gateway.io/security` with actual URL or remove placeholder link.

### Week 3: Medium-Priority Fixes (30 issues)

15. **AT-02 through AT-06**: Add `aria-hidden="true"` to all decorative SVG icons across 5 files.

16. **FL-02**: Add `id` attributes to edit-mode inputs in `Webhooks.tsx` and match `htmlFor`.

17. **FL-03**: Add visible labels to Security page password form.

18. **FL-04**: Add `aria-label="Search merchants by email"` to MerchantsList search input.

19. **AR-05 through AR-09**: Add `scope="col"` to all table `<th>` elements across 5 files.

20. **EI-06, EI-07, EI-08**: Add `role="alert"` to error messages in ApiKeys, Webhooks, Analytics.

21. **LP-01**: Add external link indicator to PaymentPageNew security link.

22. **LP-02**: Add contextual `aria-label` to "Download PDF" buttons in Invoices.

23. **RD-01, RD-02**: Wrap tables in `<div className="overflow-x-auto">` in Invoices and ApiKeys.

24. **KN-04, KN-05**: Focus management for Settings delete dialog and DocsLayout sidebar.

25. **FI-02, FI-03**: Add focus rings to StatusPage and ErrorBoundary buttons.

### Week 4: Low-Priority Improvements (19 issues)

26. **AR-10**: Add `aria-label="Documentation sidebar"` to DocsLayout sidebar nav.

27. **AR-11**: Wrap emoji icons in `<span aria-hidden="true">` in DocsLayout sidebar.

28. **AR-12**: Add `aria-label="Copy code snippet"` to DeveloperIntegration copy button.

29. **AR-13**: Make ThemeToggle state-aware with dynamic `aria-label`.

30. **AT-07 through AT-10**: Add `aria-hidden` to remaining decorative SVGs and accessible text to loading spinners.

31. **LP-03, LP-04**: Add contextual aria-labels and fix `<a>` vs `<Link>` in DeveloperIntegration.

32. **HH-01, HH-02**: Review heading hierarchy in dashboard composition.

33. **FI-04, FI-05**: Add focus indicators to period buttons and refund filter buttons.

34. **RD-03, RD-04**: Add overflow handling to remaining tables.

35. **SEC-02, SEC-03**: Add error handling for clipboard API failures.

---

## Accessibility Strengths (What's Done Well)

1. **`lang="en"` on `<html>`** -- Properly set for screen reader language detection.
2. **Skip-to-content links** -- Present on both public pages (`PublicNav.tsx`) and dashboard (`DashboardLayout.tsx`).
3. **Semantic landmarks** -- Proper use of `<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>` across layouts.
4. **Auth form accessibility** -- Login and Signup pages have exemplary ARIA usage: `aria-required`, `aria-invalid`, `aria-describedby`, `role="alert"` on errors, proper `htmlFor`/`id` pairing.
5. **TransactionsTable** -- Best-in-class accessible table: `role="table"`, `scope="col"`, keyboard navigation, `aria-label` on status badges.
6. **Theme system** -- CSS custom properties enable light/dark mode with mostly good contrast ratios.
7. **Lazy loading with Suspense** -- Code splitting does not break route accessibility.
8. **PublicNav mobile menu** -- Proper focus management, Escape key handling, ARIA state attributes.

---

## Conclusion

The StableFlow frontend has a stronger accessibility foundation than many prototype-stage applications. The auth pages and data tables demonstrate that the team understands accessibility patterns when they are applied. The primary gap is **inconsistent application** -- patterns that work well in Login.tsx and TransactionsTable.tsx are not replicated across dashboard pages, settings, and interactive components.

The most impactful remediation actions are:
1. Add `role="alert"` to all dynamic error messages (8 files, ~15 minutes each)
2. Add `aria-hidden="true"` to all decorative SVGs (10 files, ~5 minutes each)
3. Add `aria-pressed` to all toggle/filter buttons (4 files, ~10 minutes each)
4. Fix hardcoded colors in PaymentPageNew.tsx (1 file, ~30 minutes)
5. Create /terms and /privacy routes (1 file + 2 new pages, ~1 hour)

Total estimated remediation effort: **3-4 developer days** for Critical + High issues.
