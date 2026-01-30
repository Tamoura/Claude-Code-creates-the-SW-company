# SEC-014: Refund Webhook Sent Before Sufficient Finality

## Problem
- `processRefund` in `refund.service.ts` marks refund as `COMPLETED` and sends `refund.completed` webhook after just 1 blockchain confirmation
- In `blockchain-transaction.service.ts`, `executeRefund` calls `tx.wait(1)` -- only 1 confirmation
- A blockchain reorg could reverse the transaction after the merchant has already acted on the webhook

## Solution
1. Add network-specific confirmation constants: `{ polygon: 12, ethereum: 3 }`
2. After initial tx broadcast (1 confirmation), return `pendingConfirmations` field
3. Set refund status to `PROCESSING` (not `COMPLETED`) after 1 confirmation
4. Send `refund.processing` webhook (not `refund.completed`)
5. New method `confirmRefundFinality(refundId, txHash, network)` checks on-chain confirmations and transitions to `COMPLETED` when sufficient

## Files Modified
- `apps/api/src/services/blockchain-transaction.service.ts` -- add CONFIRMATION_REQUIREMENTS, pendingConfirmations in result
- `apps/api/src/services/refund.service.ts` -- use PROCESSING status after executeRefund, add confirmRefundFinality method
- `apps/api/tests/services/refund-confirmation-finality.test.ts` -- new tests

## TDD Approach
- RED: Write failing tests first
- GREEN: Implement minimal code to pass
- REFACTOR: Clean up
