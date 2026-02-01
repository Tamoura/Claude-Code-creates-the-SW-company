# Merchant Payment → Dashboard Status Display

## Problem
When a merchant creates a payment via API key, the dashboard displays
the payment status as FAILED instead of PENDING. The API returns
uppercase statuses (`PENDING`) but `mapStatus()` only checked lowercase,
so everything fell through to `default: return 'FAILED'`.

## Fix Applied
`mapStatus()` now calls `status.toLowerCase()` before the switch — already
in place at `useDashboardData.ts:37`.

## Test Strategy (3 layers)

1. **Unit** — `useDashboardData.test.ts`: mock data with uppercase
   statuses, assert correct mapping through the hook.
2. **API Integration** — `merchant-payment-flow.test.ts`: signup → API
   key → create payment via API key → verify PENDING status.
3. **Playwright E2E** — `merchant-payment-status.spec.ts`: API setup,
   login via UI, verify dashboard shows PENDING badge.

## Key Observations
- Mock data in `dashboard-mock.ts` uses lowercase statuses
- Real API returns uppercase (e.g., `PENDING`, `COMPLETED`)
- `PaymentSession` type defines lowercase union but API sends uppercase
- `computeStats()` also compares `s.status === 'completed'` — potential
  issue for stats accuracy with real API data (out of scope for this test)
