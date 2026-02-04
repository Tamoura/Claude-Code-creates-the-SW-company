# AIRouter API Prototype

## Branch: prototype/airouter
## Port: 5006

## Status: In Progress

## Architecture Decisions
- Reuse auth, prisma, redis, observability, crypto, encryption, logger from stablecoin-gateway
- Adapt crypto.ts prefix from sk_live/sk_test to air_live/air_test
- Adapt encryption.ts env var from WEBHOOK_ENCRYPTION_KEY to PROVIDER_KEY_ENCRYPTION_KEY
- Use Jest + ts-jest (matching other products)
- CommonJS module style (matching stablecoin-gateway tsconfig)

## Key Design
- BYOK model: users provide their own provider API keys
- AES-256-GCM encryption for stored provider keys
- OpenAI-compatible proxy endpoint
- Smart routing: pick provider with most remaining quota
- Per-key usage tracking with daily reset

## File Count Budget
- Target: under 30 files to avoid pre-commit hook issues
- Strategy: consolidate routes and keep services lean
