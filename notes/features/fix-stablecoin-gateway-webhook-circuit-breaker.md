# Webhook Circuit Breaker

## Issue
MEDIUM severity: Failing webhook endpoints receive delivery attempts
indefinitely. No circuit breaker stops deliveries to consistently
broken endpoints.

## File
`products/stablecoin-gateway/apps/api/src/services/webhook-delivery.service.ts`

## Design
- Track consecutive failures per endpoint in Redis
- After 10 consecutive failures, open the circuit (pause deliveries)
- Open circuit skips delivery and logs a warning
- After 5-minute cooldown, circuit resets (half-open -> closed on success)
- Successful delivery resets the failure counter
- If Redis is unavailable, circuit breaker is disabled (all attempts allowed)

## Key Constants
- CIRCUIT_THRESHOLD = 10
- CIRCUIT_RESET_MS = 5 * 60 * 1000 (5 minutes)

## Redis Keys
- `circuit:failures:{endpointId}` - consecutive failure count (TTL 600s)
- `circuit:open:{endpointId}` - timestamp when circuit opened (TTL = CIRCUIT_RESET_MS)

## Constructor Change
Add optional `redis?: Redis | null` parameter alongside existing `prisma`.
Matches pattern used by NonceManager and other services.
