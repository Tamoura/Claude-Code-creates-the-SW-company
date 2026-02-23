# World-Class Phase 1: Quick Wins

## Branch: fix/connectin/world-class-phase1

## Goal
Fix every sub-8 score and low-hanging fruit to bring all dimensions to 8.5+.

## Tasks
1. [x] Branch created
2. [x] GDPR Art 18 — Right to Restrict Processing
3. [x] GDPR Art 21 — Right to Object
4. [x] Dark mode contrast fixes
5. [x] Modal focus traps improvements
6. [x] Sentry integration
7. [x] LOG_SALT required in production
8. [x] axe-core in E2E

## Key Decisions
- GDPR restrict/object endpoints go in auth module (alongside existing export/delete)
- User model has `isRestricted` + `restrictedAt` fields (not JSON blob)
- ProcessingObjection model tracks Art 21 objections per-type with audit trail
- Sentry: @sentry/node for API, @sentry/nextjs for web, PII stripped from events
- axe-core: @axe-core/playwright scans login, register, feed pages for WCAG AA
- Dark mode uses #5DD4E8 for active elements (7:1 contrast ratio on dark bg)
- Focus trap added to NotificationsPanel; body scroll lock on all modals

## Test Results
- 243 API tests passing (17 new GDPR tests + 1 LOG_SALT test)
- 3 new E2E a11y specs (require live services to run)
- All existing tests unaffected
