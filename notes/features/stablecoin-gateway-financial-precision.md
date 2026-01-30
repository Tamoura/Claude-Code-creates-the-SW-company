# Stablecoin Gateway: Financial Precision Fix

## Problem

JavaScript Number (IEEE 754 double-precision float) causes rounding
errors in financial calculations. Classic example: `0.1 + 0.2 !== 0.3`.

In the stablecoin-gateway, three services used `Number()` for monetary
arithmetic:

1. **refund.service.ts** - accumulated refund totals with
   `sum + Number(r.amount)` and computed remaining with subtraction
2. **blockchain-monitor.service.ts** - converted wei to USD with
   `Number(amountWei) / Math.pow(10, decimals)`
3. **refund.service.ts** (updatePaymentStatusIfFullyRefunded) - used
   floating-point tolerance (`Math.abs(diff) < 0.01`) instead of exact
   comparison

## Solution

Replaced all financial arithmetic with `decimal.js` (arbitrary-precision
decimal library).

### Changes

- `refund.service.ts`: Extracted `computeRefundedTotal()` and
  `computeRemainingAmount()` as exported pure functions using Decimal.js.
  Replaced tolerance-based full-refund check with exact `.equals()`.
- `blockchain-monitor.service.ts`: Added `weiToUsd()` exported helper.
  Replaced inline `Number(amountWei) / Math.pow(10, decimals)` with
  Decimal division.

### Not Changed

- `payment.service.ts`: `Number()` calls there serialize Prisma Decimal
  to JSON for webhook payloads/API responses. No arithmetic involved.

## Tests

12 tests in `tests/services/financial-precision.test.ts`:
- Decimal 0.1 + 0.2 = 0.3 exactly
- Three $33.33 refunds on $99.99 leaves $0.00
- Large amounts (>$1M) maintain precision
- Wei-to-USD conversion (USDC 6 decimals)
- Refund remaining calculation edge cases
