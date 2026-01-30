# FIX-PHASE3-09: Enforce Payment Session Expiry

## Problem
Payment sessions have an `expiresAt` field but it was never enforced.
Expired sessions could still be updated to CONFIRMING or COMPLETED
status, defeating the purpose of the expiry mechanism.

## Solution
Added expiry enforcement in two locations:

1. **PATCH route handler** (`payment-sessions.ts`): Checks if the
   session is expired before allowing status transitions to
   CONFIRMING or COMPLETED. Uses a sentinel return pattern to
   ensure the FAILED status update is committed by the transaction
   before the error is thrown.

2. **Payment service** (`payment.service.ts`): Added the same check
   in `updatePaymentStatus()` for any code paths that update status
   through the service layer.

## Key Design Decisions

- **Sentinel pattern for transactions**: The PATCH route uses a
  Prisma `$transaction`. Throwing an error inside a transaction
  causes rollback. To ensure the FAILED status persists, we return
  a `{ __expired: true }` sentinel from the transaction and throw
  the error after the transaction commits.

- **FAILED transitions allowed**: Expired sessions can still be
  set to FAILED (the desired terminal state). Only CONFIRMING and
  COMPLETED are blocked.

- **Non-status updates allowed**: Updating fields like
  `customer_address` on an expired session works fine because the
  expiry check only gates status advancement.

## Tests (9 passing)
- Non-expired session can be updated
- Non-expired session does not trigger expiry error
- Expired session rejected for CONFIRMING (400)
- Expired session rejected for COMPLETED (400)
- Expired session auto-set to FAILED in DB
- Clear error message indicating expiry
- Expired session can still transition to FAILED
- Far-future expiry works fine
- Non-status field updates on expired sessions work

## Files Changed
- `apps/api/src/routes/v1/payment-sessions.ts` - Added expiry check
- `apps/api/src/services/payment.service.ts` - Added expiry check
- `apps/api/tests/routes/v1/payment-session-expiry.test.ts` - New test file
