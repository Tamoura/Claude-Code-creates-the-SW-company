# Feature: Add refund.processing to WebhookEventType

## Summary

Add `refund.processing` to the `WebhookEventType` union type and
all related Zod validation schemas so that the webhook system can
emit events when a refund enters the processing state.

## Locations to change

1. `webhook-delivery.service.ts` - WebhookEventType union (line 36-44)
2. `webhook-delivery.service.ts` - Comment block (lines 19-28)
3. `validation.ts` - createWebhookSchema Zod enum (lines 143-153)
4. `validation.ts` - updateWebhookSchema Zod enum (lines 163-173)

## Total expected event types after change: 9

payment.created, payment.confirming, payment.completed,
payment.failed, payment.refunded, refund.created,
refund.processing, refund.completed, refund.failed
