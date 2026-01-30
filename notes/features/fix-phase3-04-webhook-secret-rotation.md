# FIX-PHASE3-04: Webhook Secret Rotation Endpoint

## Problem
No endpoint existed to rotate webhook secrets. Merchants had to
delete and recreate webhooks to rotate compromised secrets, which
caused loss of delivery history.

## Solution
Added `POST /v1/webhooks/:id/rotate-secret` endpoint that:
- Generates a new cryptographically secure secret (whsec_ prefix)
- Encrypts with AES-256-GCM if WEBHOOK_ENCRYPTION_KEY is set
- Updates the webhook record in-place (preserving delivery history)
- Returns the new plaintext secret (only time it is shown)
- Logs the rotation event for audit trail

## Files Changed
- `apps/api/src/routes/v1/webhooks.ts` - Added rotate-secret route
- `apps/api/tests/routes/v1/webhook-rotation.test.ts` - 8 tests

## Test Coverage (8 tests)
1. Rotate returns new whsec_ secret with rotation timestamp
2. Old secret no longer stored in DB after rotation
3. New secret produces valid HMAC signatures
4. Non-existent webhook ID returns 404
5. Non-owner gets 404 (prevents enumeration)
6. Unauthenticated request returns 401
7. updatedAt timestamp is updated on rotation
8. Rotation event is logged

## API
```
POST /v1/webhooks/:id/rotate-secret
Authorization: Bearer <token>

Response 200:
{
  "id": "<webhook-id>",
  "secret": "whsec_<64 hex chars>",
  "rotatedAt": "<ISO 8601>"
}
```

## Notes
- Follows same ownership pattern as other webhook endpoints
- Returns 404 (not 403) for non-owner access to prevent webhook
  ID enumeration
- Secret storage approach mirrors the creation endpoint (encrypted
  if key available, plaintext otherwise)
