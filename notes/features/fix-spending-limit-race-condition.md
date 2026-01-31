# Fix: Spending Limit Race Condition

## Problem
In `blockchain-transaction.service.ts`, the `checkSpendingLimit()` method
(lines 208-242) and `recordSpend()` method (lines 249-266) are separate
operations. Two concurrent refund requests can both pass the check before
either records its spend, bypassing the daily limit.

## Root Cause
The check-then-record pattern is not atomic. Between the time a request
reads the current spend and the time it increments the spend counter,
another request can also read the (stale) current spend and pass the check.

## Fix
Replace separate `checkSpendingLimit()` + `recordSpend()` with a single
`checkAndRecordSpend()` method using a Redis Lua script that atomically
checks AND increments the spend counter. Redis executes Lua scripts
atomically (single-threaded), so no two concurrent requests can interleave.

## Key Changes
- Add `eval` to `SpendingLimitRedis` interface
- Add static `ATOMIC_SPEND_SCRIPT` Lua script to the class
- New `checkAndRecordSpend()` method replaces both old methods
- `executeRefund()` calls `checkAndRecordSpend()` instead of separate check/record
- Mark old methods as deprecated

## Test File
`tests/services/spending-limit-atomicity.test.ts`
