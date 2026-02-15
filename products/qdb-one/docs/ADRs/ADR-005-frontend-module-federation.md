# ADR-005: Frontend — Module Federation Micro-Frontends

**Status**: Accepted
**Date**: February 15, 2026
**Deciders**: Architecture Practice
**Category**: Frontend Architecture

---

## Context

QDB One must present a unified UI that incorporates functionality from multiple portal teams (Financing, Advisory, Guarantees) while allowing independent development and deployment. The user experience must be seamless — no page reloads, no re-authentication, no context loss when navigating between portal features. The platform must support full Arabic RTL and English LTR with dynamic switching.

Portal teams need to deploy UI changes independently without coordinating releases across all teams.

## Decision

Use **Webpack Module Federation** to compose the frontend as a shell application with remote modules:

1. **Shell Application (Host)**: Owns the app shell (header, navigation, search bar, notification bell, persona switcher, footer), unified routing, and shared dependencies. Always loaded.

2. **Remote Modules**: Each portal is a separate Webpack bundle deployed independently:
   - `@qdb/dashboard-module` — Unified dashboard with cross-portal cards
   - `@qdb/finance-module` — Loan applications, payments, documents
   - `@qdb/guarantee-module` — Guarantees, signatures, claims
   - `@qdb/advisory-module` — Programs, sessions, assessments
   - `@qdb/documents-module` — Unified document center
   - `@qdb/profile-module` — Profile, preferences, identity linking
   - `@qdb/admin-module` — Internal staff tools (separate deployment)

3. **Shared packages** (loaded once by shell):
   - `@qdb/design-system` — Bilingual UI components (AR/EN, RTL/LTR)
   - `@qdb/auth-context` — Authentication state, Keycloak integration
   - `@qdb/shared-state` — Cross-module state (active persona, notifications)
   - `@qdb/navigation` — Unified routing, breadcrumbs, deep-link resolution

4. **Loading strategy**: Shell + design system + auth context loaded eagerly. Dashboard prefetched after initial render. Portal modules lazy-loaded on first navigation (skeleton screens during load, cached after first visit).

5. **Module communication**: Modules do not call each other directly. Communication happens via a shared event bus (`persona:changed`, `language:changed`, `navigate:request`, `action:completed`).

## Consequences

### Positive
- Independent deployment per portal team (financing UI change does not require guarantee team coordination)
- Shared React and design system loaded once — no duplication
- Seamless navigation (client-side route changes, no page reloads)
- Deep-linkable URLs for every page across all portals
- Browser back/forward works naturally across portal boundaries
- Module load failures are isolated — other modules remain functional

### Negative
- Webpack version must be synchronized across all modules (coupling at build tool level)
- Inter-module communication requires a well-defined event bus contract
- Debugging cross-module issues is harder than monolithic SPA
- Must implement fallback UI for module load failures
- Shell becomes a critical path — a shell failure takes down everything

### Risks
- Module Federation cross-module communication failures. **Mitigation**: Strict shared state contract with TypeScript types; event bus protocol tests in CI; fallback UI for module load failures.
- Shell application bundle size exceeds 250 KB. **Mitigation**: Performance budget enforced in CI; only shared dependencies in shell; tree-shaking; code splitting.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| **A. Monolithic SPA** | Simplest, fastest initial dev, consistent UX | All teams coupled, deploy together, coordination bottleneck | Does not scale as team grows |
| **B. Module Federation** (selected) | Independent deploy, shared deps, runtime composition | Webpack-specific, inter-module complexity | Best balance of independence and UX |
| **C. iframes** | Complete isolation | Poor UX, no shared state, accessibility issues, performance | Unacceptable user experience |
| **D. Single-SPA** | Framework-agnostic | More boilerplate, less mature tooling | Only needed if portals used different frameworks (they do not) |
