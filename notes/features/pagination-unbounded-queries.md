# Pagination for Unbounded List Queries

## Problem
GET /v1/api-keys and GET /v1/webhooks call findMany without take/skip.

## Solution
Add limit (default 50, max 100) and offset (default 0) query params.
Return { data, pagination: { limit, offset, total, has_more } }.

## Files modified
- src/utils/validation.ts - added listApiKeysQuerySchema, listWebhooksQuerySchema
- src/routes/v1/api-keys.ts - paginated GET /
- src/routes/v1/webhooks.ts - paginated GET /
