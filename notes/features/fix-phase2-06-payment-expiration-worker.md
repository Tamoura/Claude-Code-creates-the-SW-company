# FIX-PHASE2-06: Payment Expiration Worker

## Problem
Payments have `expiresAt` set to 7 days but no worker expires stale PENDING
payments. This leads to database bloat and potential abuse.

## Design Decisions

- **No EXPIRED status in PaymentStatus enum**: The Prisma schema only has
  PENDING, CONFIRMING, COMPLETED, FAILED, REFUNDED. Will use FAILED status
  with appropriate logging to indicate expiration.
- **No updatedAt on PaymentSession**: Cannot use updatedAt for finding recently
  expired sessions after updateMany. Must use a two-step approach: findMany
  first, then updateMany.
- **Webhook event**: Use `payment.failed` since `payment.expired` is not in
  the WebhookEventType union. Include expiration context in payload data.
- **WebhookDeliveryService**: The real webhook service (not WebhookService)
  that handles queue + delivery.

## Test Cases
1. Expires PENDING payments past expiresAt
2. Does not expire non-PENDING payments (COMPLETED, FAILED, etc.)
3. Does not expire PENDING payments not yet past expiresAt
4. Queues payment.failed webhooks for expired sessions
5. Handles webhook queue failures gracefully (no crash)
6. Worker start/stop lifecycle
7. Returns count of expired payments
8. Configurable interval
