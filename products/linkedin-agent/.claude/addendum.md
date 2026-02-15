# LinkedIn Agent - Agent Context

## What is LinkedIn Agent?

LinkedIn Agent is an AI-powered LinkedIn content assistant that helps Arab tech professionals create trend-aware, engagement-optimized posts in Arabic and English. It uses OpenRouter to route tasks to the best AI model for each job.

## Architecture

```
products/linkedin-agent/
├── apps/
│   ├── api/                  # Fastify 5 backend (port 5010)
│   │   ├── src/
│   │   │   ├── plugins/      # Fastify plugins (prisma, openrouter, cors, etc.)
│   │   │   ├── routes/       # Route handlers (trends, posts, models)
│   │   │   ├── services/     # Business logic (trend-analyzer, post-generator, model-router)
│   │   │   └── server.ts     # Fastify server entry point
│   │   ├── prisma/
│   │   │   └── schema.prisma # Database schema
│   │   └── tests/
│   └── web/                  # Next.js 15 frontend (port 3114)
│       └── src/
│           ├── app/          # App Router pages
│           ├── components/   # React components (RTL-aware)
│           ├── hooks/        # Custom hooks (useApi, useRTL)
│           └── lib/          # Utilities (api client, formatting)
├── docs/
│   ├── PRD.md               # Product requirements
│   ├── API.md               # Endpoint documentation
│   └── ADRs/                # Architecture decisions
└── e2e/                     # Playwright E2E tests
```

## Key Patterns

### OpenRouter Integration

All AI calls go through a centralized OpenRouter service. Model routing is configured by task type:

| Task | Model | Why |
|------|-------|-----|
| Arabic post writing | Claude | Best Arabic quality |
| Trend analysis | Gemini | Long context, analytical |
| Translation | Claude | Maintains tone |
| Quick edits | GPT-4o-mini | Fast, cheap |

The OpenRouter service should be a Fastify plugin that provides `fastify.openrouter.complete(model, messages)` with built-in retry, error handling, and usage tracking.

### Arabic-First / RTL

- **UI is RTL-native**: Use Tailwind's `dir="rtl"` on the html element and `rtl:` variant classes
- **Content is Arabic-primary**: Post generation defaults to Arabic
- **Text rendering**: Use `font-family` stacks that include Arabic fonts (e.g., Noto Sans Arabic)
- **Bidirectional text**: Handle mixed Arabic/English content carefully in post previews

### Database Schema (Core Entities)

- **TrendAnalysis**: stores pasted content, extracted topics, source language
- **Post**: generated content, language, tone, format, status (draft/published/archived)
- **Carousel**: slides linked to a post, each with headline, body, image prompt
- **ModelUsage**: per-request tracking of model, tokens, cost
- **FormatRecommendation**: stored alongside post, includes reasoning

### API Conventions

- All routes under `/api/` prefix
- JSON request/response bodies
- Pagination: `{ data: [], pagination: { page, limit, total, totalPages } }`
- Errors: `{ error: { code: string, message: string, details?: object } }`
- Rate limiting on AI-heavy endpoints

### Testing Strategy

- **Unit tests**: Service layer (trend analyzer, post generator, model router)
- **Integration tests**: API routes with real database, mocked OpenRouter responses
- **E2E tests**: Full flows (paste content -> analyze -> generate post -> copy)
- **No mocks for database**: Use real PostgreSQL with test database
- **OpenRouter can be mocked**: Use nock/msw for external API calls in tests

## Ports

- **API**: 5010
- **Web**: 3114
- Registered in `.claude/PORT-REGISTRY.md`

## Environment Variables

```
DATABASE_URL=postgresql://postgres@localhost:5432/linkedin_agent_dev
OPENROUTER_API_KEY=sk-or-...
PORT=5010
NODE_ENV=development
```

## Working on This Product

1. **Check COMPONENT-REGISTRY.md** before building any plugin, hook, or utility
2. **Use TDD**: Red-Green-Refactor for all features
3. **Arabic quality matters**: Test generated Arabic content for naturalness
4. **RTL from day one**: Never build a component without RTL support
5. **Track AI costs**: Every OpenRouter call must log model, tokens, and cost
