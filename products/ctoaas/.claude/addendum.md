# CTOaaS - Agent Addendum

## Product Overview

**Name**: CTOaaS (CTO as a Service)
**Type**: Web app (full-stack)
**Status**: Inception
**Description**: AI-powered advisory platform that augments the decision-making capabilities of CTOs, CIOs, and VPs of Engineering. Combines conversational AI with curated engineering knowledge (RAG), organizational personalization, risk surfacing, cost analysis, and an interactive technology radar.

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js 14+ / React 18+ | Port 3120. App Router. SSR for landing page SEO. |
| Backend | Fastify / TypeScript | Port 5015. Plugin architecture. SSE for streaming. |
| Database | PostgreSQL 15+ with pgvector | Users, orgs, conversations, embeddings, risk data. pgvector for RAG similarity search. |
| ORM | Prisma | Type-safe queries, migration management. |
| Cache | Redis | Session cache, rate limiting, conversation context. Graceful degradation when unavailable. |
| Storage | S3/R2 | Knowledge base documents, exported reports. |
| Primary LLM | Anthropic Claude API | Advisory response generation (primary). |
| LLM Fallback | OpenAI GPT-4 via OpenRouter | Automatic failover. Budget cap per request. |
| Embeddings | OpenAI Embeddings API | Vector embeddings for RAG pipeline. |
| Styling | Tailwind CSS + shadcn/ui | ConnectSW defaults. |
| Testing | Jest, React Testing Library, Playwright | Unit, integration, E2E. |
| CI/CD | GitHub Actions | Standard ConnectSW pipeline. |

## Libraries & Dependencies

### Adopted (Use These)

| Library | Purpose | Why Chosen |
|---------|---------|------------|
| `@connectsw/auth` | Authentication (signup, login, JWT, refresh) | Reuse from shared packages |
| `@connectsw/shared/utils/logger` | Structured logging with PII redaction | Reuse from shared packages |
| `@connectsw/shared/utils/crypto` | Password hashing and crypto | Reuse from shared packages |
| `@connectsw/shared/plugins/prisma` | Prisma connection lifecycle | Reuse from shared packages |
| `@connectsw/shared/plugins/redis` | Redis connection with graceful degradation | Reuse from shared packages |
| `@connectsw/ui/components` | Button, Card, Input, Badge, StatCard, DataTable | Reuse from shared packages |
| `@connectsw/ui/layout` | DashboardLayout, Sidebar | Reuse from shared packages |
| `@connectsw/ui/hooks` | useTheme (dark mode) | Reuse from shared packages |
| `@anthropic-ai/sdk` | Claude API client | Official SDK |
| `openai` | OpenAI embeddings + fallback | Official SDK |
| `ioredis` | Redis client | ConnectSW standard |

### Avoid (Don't Use)

| Library | Reason |
|---------|--------|
| `langchain` | Too heavy for our use case; custom RAG pipeline preferred for control |
| `pinecone` / `weaviate` | pgvector is sufficient for Phase 1 scale; dedicated vector DB is Phase 2 consideration |
| `socket.io` | Use SSE (Server-Sent Events) for streaming; simpler, sufficient for one-way streaming |

## Site Map

| Route | Status | Description |
|-------|--------|-------------|
| `/` | MVP | Landing page with product overview and CTA |
| `/signup` | MVP | Registration form |
| `/login` | MVP | Login form |
| `/verify-email` | MVP | Email verification handler |
| `/onboarding` | MVP | Multi-step company profile setup |
| `/dashboard` | MVP | Main dashboard with summary cards |
| `/chat` | MVP | Advisory chat interface with sidebar |
| `/chat/:conversationId` | MVP | Specific conversation view |
| `/risks` | MVP | Risk dashboard (4 categories) |
| `/risks/:category` | MVP | Risk category detail |
| `/costs` | MVP | Cost analysis hub |
| `/costs/tco` | MVP | TCO comparison calculator |
| `/costs/tco/:comparisonId` | MVP | Specific TCO comparison |
| `/costs/cloud-spend` | MVP | Cloud spend analysis |
| `/radar` | MVP | Interactive technology radar |
| `/settings` | MVP | Settings hub |
| `/settings/profile` | MVP | Edit company profile |
| `/settings/account` | MVP | Account settings |
| `/settings/preferences` | MVP | Advisory preferences |
| `/help` | Deferred | Help page (skeleton) |
| `/integrations` | Deferred | Integrations page (skeleton) |
| `/reports` | Deferred | Report generation (skeleton) |
| `/team` | Deferred | Team management (skeleton) |
| `/compliance` | Deferred | Compliance checker (skeleton) |
| `/adrs` | Deferred | ADR management (skeleton) |

## Design Patterns

### Component Patterns
- Chat interface is a custom build (no matching component in registry)
- Technology radar is a custom circular visualization
- Reuse `@connectsw/ui` components for all standard UI (buttons, cards, inputs, tables, layout)

### State Management
- React Server Components for static pages (landing, settings)
- Client components for interactive features (chat, radar, cost calculator)
- SWR or React Query for API data fetching and caching

### API Patterns
- RESTful endpoints for CRUD operations
- SSE (Server-Sent Events) for streaming chat responses
- JWT authentication with httpOnly refresh token rotation
- All queries scoped by organization ID (mandatory)
- Rate limiting: 100 req/min general, 20 req/min LLM endpoints

## Business Logic

### Key Calculations/Algorithms
- **RAG Pipeline**: Query embedding -> pgvector similarity search (cosine, top-5, threshold 0.7) -> rerank -> inject into prompt
- **Conversation Summarization**: When messages > 10, older messages are summarized; last 10 retained verbatim; key facts extracted to long-term memory
- **Risk Scoring**: Analyze company profile tech stack against known EOL dates, CVE databases, vendor concentration, compliance requirements. Score 1-10 per category.
- **TCO Calculator**: 3-year projection with development cost (team size x duration x loaded cost), infrastructure cost, maintenance cost, opportunity cost

### Validation Rules
- Email: valid format, unique
- Password: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- Company profile: name (required), industry (from list of 20+), employee count (required), growth stage (required), at least 1 challenge
- Chat message: 1-10,000 characters, not empty/whitespace
- Free tier: 20 messages/day limit

## Data Models

### Key Entities
- **User** -> belongs to Organization, has Conversations, Preferences, RefreshTokens
- **Organization** -> has CompanyProfile, RiskItems, Users
- **Conversation** -> has Messages (ordered by timestamp)
- **KnowledgeDocument** -> has KnowledgeChunks (with vector embeddings)
- **RiskItem** -> organization-scoped, 4 categories
- **TcoComparison** -> user-scoped, stores options and projections
- **TechRadarItem** -> standalone reference data (shared across users)

## External Integrations

| Service | Purpose | Documentation |
|---------|---------|---------------|
| Anthropic Claude API | Primary LLM for advisory responses | https://docs.anthropic.com/ |
| OpenAI API | Embedding generation + LLM fallback | https://platform.openai.com/docs/ |
| OpenRouter | Unified LLM routing with failover | https://openrouter.ai/docs |
| S3/R2 | Knowledge base document storage | AWS/Cloudflare docs |

## Performance Requirements

- Page load: less than 2 seconds (dashboards)
- Chat streaming start: less than 3 seconds (p95)
- Full response: less than 15 seconds (p95)
- Vector search: less than 500ms (up to 100K embeddings)
- TCO recalculation: less than 1 second
- Concurrent users: 1,000 with less than 5% degradation
- API cost per interaction: less than $0.05

## Special Considerations

1. **Data Sensitivity**: CTO organizational data is highly sensitive (tech stacks, costs, risks, strategic decisions). All agents must enforce org-scoped queries and encryption.
2. **LLM Data Sanitization**: Never send raw financials, credentials, or unnecessary PII to LLM APIs. A sanitization step runs before every LLM call.
3. **No Customer Source Code**: Per BR-005, the platform never stores or transmits customer source code to LLM providers.
4. **AI Disclaimer**: Every advisory response must include a disclaimer that it is AI-generated and not professional advice (BR-007).
5. **Freemium Gating**: Free tier users are rate-limited to 20 queries/day. Feature flags gate Pro-only features.
6. **Single-User MVP**: Phase 1 is single-user per organization. Data model has `organization_id` FK on user preferences for future team sharing.
7. **Graceful Degradation**: When Redis is unavailable, fall back to direct DB queries and in-memory rate limiting. When Claude API is unavailable, fall back to OpenAI via OpenRouter.

---

*Created by*: Product Manager
*Last Updated*: 2026-03-11
