# Admin Merchant View — Stablecoin Gateway

## Branch
`feature/stablecoin/admin-merchant-view`

## Goal
Admin user logs in, sees all merchants with payment stats,
drills into a merchant's payments.

## Key Decisions
- Role enum: MERCHANT (default), ADMIN
- Admin created via seed only — no API to change roles
- requireAdmin decorator: checks role === ADMIN, throws 403
- Role included in JWT payload and login/signup responses
- Admin routes: GET /v1/admin/merchants, GET /v1/admin/merchants/:id/payments

## TDD Order
1. admin-auth.test.ts — role in login/signup responses
2. admin-routes.test.ts — 401/403/200 + data shape + pagination
3. Frontend — Sidebar, hooks, pages

## Progress
- [ ] Phase 1: Database — Role enum + migration
- [ ] Phase 2: Backend auth — requireAdmin + role in JWT
- [ ] Phase 3: Backend admin routes
- [ ] Phase 4-6: Frontend — API client, routing, sidebar, pages
- [ ] PR
