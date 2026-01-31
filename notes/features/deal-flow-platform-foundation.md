# DealGate -- Foundation Phase Notes

**Date**: 2026-01-31
**Branch**: foundation/deal-flow-platform
**PR**: #47

## Prototype Status

### Foundation Phase (Complete) -- 114 tests

**Backend** (49 tests, 7 suites):
- Fastify API on port 5003
- 22 REST endpoints across 7 route groups
- JWT auth + RBAC (4 roles)
- Prisma + PostgreSQL (20 models, shared-schema multi-tenancy)
- Deal status workflow, audit logging, cursor pagination
- Database seed: 15 Qatar market deals, 5 test users

**Frontend** (65 tests, 6 suites):
- Next.js 14 App Router on port 3108
- next-intl for Arabic (RTL) + English (LTR)
- Tailwind CSS: maroon (#8B1538), gold (#C5A572), sand (#F5E6CC), pearl
- Page shells: marketplace, deals, deal detail, auth, investor, issuer
- API client with JWT, auth context/provider
- UI: Button (5 variants, 3 sizes), Card (6 sub-components)
- AR/EN translations: 100% key parity

### Next Phase: Marketplace
- Connect deal listing to backend API
- Search/filter UI with real data
- Deal detail page with live data
- Responsive grid layout

## Key Technical Decisions

1. next-intl v3.9 with `createSharedPathnamesNavigation` for i18n routing
2. URL-based locale: `/en/deals` and `/ar/deals`
3. `dir="rtl"` on `<html>` tag for Arabic, driven by locale
4. API proxy via Next.js rewrites (frontend `/api/*` -> backend `5003`)
5. Auth: access token in memory (React state), refresh via httpOnly cookie
6. Tailwind CSS with `tailwindcss-rtl` plugin for RTL variants
7. Cairo font for Arabic, Inter for English

## Test Parallelism Note

Backend tests use `--runInBand` because all suites share a single test
database and clean it in `beforeEach`. Frontend tests run in parallel
(no shared state).
