# CTOaaS Foundation - Sprint 1

## Branch: `foundation/ctoaas`

## Ports
- Frontend: 3120
- Backend: 5015

## Sprint 1 Tasks — ALL COMPLETE

| Task | Status | Agent |
|------|--------|-------|
| IMPL-001 Backend scaffold | Done | backend-engineer |
| IMPL-002 Frontend scaffold | Done | frontend-engineer |
| IMPL-003 CI/Docker/env | Done | devops-engineer |
| IMPL-004 Port registration | Done | orchestrator |
| IMPL-005 Prisma schema | Done | data-engineer |
| IMPL-006 Migration + seed | Done | data-engineer |
| IMPL-007 Health test (Red) | Done | backend-engineer |
| IMPL-008 Health endpoint (Green) | Done | backend-engineer |
| IMPL-009 Auth tests (Red) | Done | qa-engineer |
| IMPL-010 Auth implementation (Green) | Done | backend-engineer |
| IMPL-011 Auth pages frontend | Done | frontend-engineer |
| IMPL-012 Sprint 1 checkpoint | PASS | orchestrator |

## Sprint 1 Checkpoint Results
- Backend tests: 36/36 passing (30 auth + 6 health)
- Frontend tests: 32/32 passing (14 validation + 7 signup + 6 login + 5 verify-email)
- Total tests: 68/68 passing
- Database: 14 tables, 31 seed items, pgvector + HNSW indexes
- Commits: 10 on foundation/ctoaas branch

## Key Decisions
- Stack: Fastify + Prisma + PostgreSQL 15 + pgvector + Redis
- AI: CopilotKit + LangGraph + LlamaIndex
- LLM: Claude (primary), OpenAI via OpenRouter (fallback)
- Embeddings: OpenAI text-embedding-3-small (1536 dims)
- bcryptjs for password hashing (pure JS, no native deps)
- crypto.randomUUID() instead of uuid package (ESM compatibility)
- HTML stripping via regex for XSS prevention in name fields

## DB Schema
- 14 tables: organizations, users, company_profiles, conversations, messages, knowledge_documents, knowledge_chunks, risk_items, tco_comparisons, cloud_spend, tech_radar_items, user_preferences, refresh_tokens, audit_logs
- pgvector for embeddings, HNSW index for similarity search
- All user data org-scoped via organization_id FK

## Sprint 5 Tasks (IMPL-038 to IMPL-045) -- COMPLETE

| Task | Status | Agent |
|------|--------|-------|
| IMPL-038 Conversation tests (Red) | Done | backend-engineer |
| IMPL-039 Memory tests (Red) | Done | backend-engineer |
| IMPL-040 Search tests (Red) | Done | backend-engineer |
| IMPL-041 Preference tests (Red) | Done | backend-engineer |
| IMPL-042 ConversationService (Green) | Done | backend-engineer |
| IMPL-043 MemoryService (Green) | Done | backend-engineer |
| IMPL-044 SearchService (Green) | Done | backend-engineer |
| IMPL-045 PreferenceLearningService (Green) | Done | backend-engineer |

### Sprint 5 Results
- 25/25 new tests passing (10 conversation, 6 memory, 5 search, 4 preference)
- 102/102 total unit tests passing
- Services: conversation, memory, search, preference-learning
- Routes: /api/v1/conversations (6 endpoints), /api/v1/preferences (2 endpoints)
- Validation: Zod schemas for all inputs

### Sprint 5 Pattern: Direct DB Seeding in Tests
- For route tests, avoid the `createTestUser()` HTTP helper (flaky with shared app singleton)
- Instead, create users directly via Prisma + `app.jwt.sign()` for deterministic JWT tokens
- This eliminates the test isolation issue caused by two Prisma clients hitting the same DB

## Patterns Established
- app.ts exports `buildApp()` with plugin registration order
- index.ts calls `buildApp()` then `app.listen()`
- Config via Zod schema validation at startup
- Tests use helpers.ts with `getApp()`, `cleanDatabase()`, `createTestUser()`
- Jest with @swc/jest transform, maxWorkers: 1
- AuthService class with constructor injection (prisma, fastify)
- RFC 7807 error responses via AppError + sendError helper
- Redis graceful degradation to in-memory Map store
- Timing-safe login (dummy bcrypt on non-existent email)
