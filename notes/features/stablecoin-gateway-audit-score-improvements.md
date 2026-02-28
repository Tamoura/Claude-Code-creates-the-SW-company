# Stablecoin Gateway — P0/P1 Audit Score Improvements

## Goal
Raise API Design from 6→8 and Privacy from 6→8 to reach production-ready threshold.

## Two workstreams
1. **Route-level OpenAPI schemas** — Add Fastify `schema` objects to all 47 endpoints for Swagger UI docs
2. **Cookie consent banner** — GDPR-compliant consent mechanism with localStorage persistence

## Key decisions
- Documentation-only JSON Schema (not zod-to-json-schema) for explicit control
- `additionalProperties: true` on request bodies to avoid Fastify stripping fields
- Response schemas declare all properties for major endpoints (auth, payments, webhooks)
- Cookie consent uses localStorage key `stableflow-consent`

## Already implemented (NOT in scope)
- CI/CD pipeline (GitHub Actions)
- Correlation IDs (observability plugin)
- Admin seed (prisma/seed.ts)
- Structured logging (custom Logger)

## Branch
`feature/stablecoin-gateway/audit-improvements`
