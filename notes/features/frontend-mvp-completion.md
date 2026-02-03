# Frontend MVP Completion

## Branch
`feature/stablecoin-gateway/frontend-mvp`

## Objective
Build all missing frontend pages and features to reach PRD MVP parity, then run test/audit cycles until all scores >= 8/10.

## Baseline (before this work)
- 160 tests passing across 24 test files
- Frontend ~45% of PRD MVP complete
- Latest audit score: 8.3/10 (backend-focused)

## Tasks

### Tier 1 — Core Merchant Workflow
1. `/dashboard/create` — Payment Link Generator (F-001)
2. `/dashboard/payments/:id` — Payment Detail Page (F-010)
3. Search + CSV Export on payments list (F-004)

### Tier 2 — Customer-Facing
4. `/pricing` — Pricing page
5. `/checkout/:id/success` and `/checkout/:id/failed` — Dedicated checkout result pages
6. Merchant redirect after payment (success_url)

### Tier 3 — Developer Experience
7. `/docs` — API documentation site (quickstart, API reference, webhooks, SDK)

### Tier 4 — Settings & Compliance
8. `/dashboard/settings` — Account settings (email notifications, password change)
9. ToS/Privacy consent on signup (GDPR NFR-025, NFR-027)
10. WCAG 2.1 AA accessibility (NFR-021 through NFR-024)

### Post-Build
11. Run full test suite, fix failures
12. Audit cycle until all scores >= 8/10

## Key Decisions
- All 8 feature tasks launched as parallel frontend-developer agents
- Docs pages are static content within the React app (no separate static site generator)
- Settings page stores notification preferences in local state (no backend endpoint yet)
- Merchant address for payment link generator uses hardcoded dev address
- Checkout success/failed pages fetch from public `/v1/checkout/:id` endpoint (no auth)

## Progress
- [ ] Task 1: Payment Link Generator
- [ ] Task 2: Payment Detail Page
- [ ] Task 3: Search + CSV Export
- [ ] Task 4: Settings Page
- [ ] Task 5: Pricing Page
- [ ] Task 6: Docs Pages
- [ ] Task 7: Checkout Success/Failed
- [ ] Task 8: ToS + Accessibility
- [ ] Task 9: Integration test pass
- [ ] Task 10: Audit gate
