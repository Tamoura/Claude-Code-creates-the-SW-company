# CTOaaS Foundation - Sprint 1

## Branch: `foundation/ctoaas`

## Ports
- Frontend: 3120
- Backend: 5015

## Sprint 1 Tasks

| Task | Status | Agent |
|------|--------|-------|
| IMPL-001 Backend scaffold | Done | backend-engineer |
| IMPL-002 Frontend scaffold | In Progress | frontend-engineer |
| IMPL-003 CI/Docker/env | In Progress | devops-engineer |
| IMPL-004 Port registration | Done | orchestrator |
| IMPL-005 Prisma schema | Pending | data-engineer |
| IMPL-006 Migration + seed | Pending | data-engineer |
| IMPL-007 Health test (Red) | Pending | backend-engineer |
| IMPL-008 Health endpoint (Green) | Pending | backend-engineer |
| IMPL-009 Auth tests (Red) | Pending | qa-engineer |
| IMPL-010 Auth integration (Green) | Pending | backend-engineer |
| IMPL-011 Auth pages frontend | Pending | frontend-engineer |
| IMPL-012 Sprint 1 checkpoint | Pending | qa-engineer |

## Key Decisions
- Stack: Fastify + Prisma + PostgreSQL 15 + pgvector + Redis
- AI: CopilotKit + LangGraph + LlamaIndex
- LLM: Claude (primary), OpenAI via OpenRouter (fallback)
- Embeddings: OpenAI text-embedding-3-small (1536 dims)
- Reusing: @connectsw/auth, shared plugins (prisma, redis, logger, crypto), UI components

## DB Schema
- 13 tables: organizations, users, company_profiles, conversations, messages, knowledge_documents, knowledge_chunks, risk_items, tco_comparisons, cloud_spend, tech_radar_items, user_preferences, refresh_tokens, audit_logs
- pgvector for embeddings, HNSW index for similarity search
- All user data org-scoped via organization_id FK

## Patterns (from ConnectIn)
- app.ts exports `buildApp()` with plugin registration order
- index.ts calls `buildApp()` then `app.listen()`
- Config via Zod schema validation
- Tests use helpers.ts with `getApp()`, `cleanDatabase()`, `createTestUser()`
- Jest with @swc/jest transform, maxWorkers: 1
