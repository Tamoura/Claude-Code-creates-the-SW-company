# FIX-PHASE3-02: Refund Race Condition with Database Locking

## Problem

In `refund.service.ts`, the `createRefund` method reads the payment
session and calculates the remaining refundable amount, then creates a
refund -- all without database-level locking. Two concurrent requests
can both pass the over-refund check and create refunds that exceed
the payment amount.

## Root Cause

The read (findFirst + calculate remaining) and write (refund.create)
are not atomic. No row-level lock is taken on the payment_sessions
row, so concurrent transactions can interleave.

## Solution

Wrap createRefund in `prisma.$transaction` with `FOR UPDATE` on the
payment session row. This is the same pattern used in
`payment-sessions.ts` (lines 186-211) for preventing concurrent
payment status updates.

## Key Decisions

- Use `FOR UPDATE` row lock (not Serializable isolation) to match
  existing codebase patterns
- Include webhook queueing inside the transaction so that webhooks
  are only sent if the refund is actually created
- Transaction timeout of 10 seconds to prevent deadlocks
- Keep the same API-level interface (no route changes needed)

## Files Changed

- `apps/api/src/services/refund.service.ts` - wrap createRefund in
  $transaction with FOR UPDATE
- `apps/api/tests/services/refund-race-condition.test.ts` - new test
  file proving race condition is fixed

## Test Plan

1. Single refund succeeds normally
2. Full refund leaves zero remaining
3. Over-refund blocked (single request)
4. Concurrent refunds: simulate two requests, only one should succeed
5. Partial refunds calculate correctly
6. Transaction rolls back on error
