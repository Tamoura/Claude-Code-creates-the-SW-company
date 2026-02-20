# ArchForge Foundation Implementation Notes

**Date**: 2026-02-20
**Branch**: `foundation/archforge`
**Status**: Complete

## What Was Built

Full working foundation for ArchForge — AI-powered enterprise architecture platform.

### Backend (Fastify 5, port 5012)

- **Utility layer**: Pino logger (PII redaction), crypto (bcrypt + HMAC with `archforge_sk_`/`archforge_pk_` prefixes), env validator, RFC 7807 typed errors (`archforge.io` domain)
- **Plugin layer**: Prisma (connection pooling, graceful disconnect), Redis (optional with graceful degradation), Observability (correlation IDs, request metrics), Auth (JWT + API key dual auth)
- **Routes**: Health endpoint, auth routes (register, login + 3 stubs for refresh/logout/me)
- **Prisma schema**: 18 tables across 6 domains (Identity, Organization, Architecture, Content, Collaboration, Operations)
- **Tests**: 5 integration tests for health endpoint — all passing

### Frontend (Next.js 14, port 3116)

- Landing page with hero, 3 feature cards, CTA, footer
- 7 placeholder pages (login, register, dashboard, projects/[id], artifacts/[id], templates, settings)
- Tailwind CSS with purple brand (#7950f2), custom btn-primary/btn-secondary/card classes
- API proxy rewrites to backend on port 5012

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| User status | Lowercase strings ("registered", "active") | Matches DB schema DDL exactly |
| Register response | `{message, userId}` | API contract specifies this pattern |
| JWT expiry | 24 hours | API contract specifies 24h |
| API key prefix | `archforge_sk_` / `archforge_pk_` | Product-specific prefix for identification |
| Error domain | `archforge.io` | Matches product domain |
| Docker ports | PG 5433, Redis 6380 | Avoids HumanID default port conflicts |
| Brand color | Purple #7950f2 | Differentiates from HumanID blue |

## Differences from HumanID Pattern

- Backend port 5012 (vs 5013), Frontend port 3116 (vs 3117)
- 18 Prisma tables (vs 14) — added artifact_elements, artifact_relationships, artifact_versions, document_uploads
- Register returns message+userId (vs tokens+user)
- 24h JWT expiry (vs 15m)
- Lowercase status strings (vs enum)

## Commits (12)

1. `chore(archforge): add project scaffold with docker-compose and env config`
2. `chore(archforge): add backend package config with TypeScript and Jest`
3. `test(archforge): add health endpoint integration tests (red)`
4. `feat(archforge): add utility layer (logger, crypto, env-validator, types)`
5. `feat(archforge): add Fastify plugins (prisma, redis, observability, auth)`
6. `feat(archforge): add app builder, entry point, and auth routes (green)`
7. `feat(archforge): add complete Prisma schema (18 tables, 6 domains)`
8. `feat(archforge): add initial database migration`
9. `chore(archforge): add frontend package config and styling foundation`
10. `feat(archforge): add frontend layout, landing page, and placeholder pages`
11. `docs(archforge): add comprehensive README with setup instructions`
12. `docs(archforge): add foundation implementation notes`

## Environment Notes

- Used local Homebrew PostgreSQL 15 (port 5432) and Redis (port 6379) since Docker Desktop was unavailable
- Created `archforge_dev` database manually
- Docker compose config uses ports 5433/6380 for when Docker is available

## Next Steps

- AI generation pipeline (Claude API integration)
- Interactive canvas (ReactFlow-based editor)
- Multi-format export (PNG, SVG, PDF, PlantUML, ArchiMate XML, Mermaid)
- Real-time collaboration (WebSocket + Redis Pub/Sub)
- Template library
- OAuth providers (Google, GitHub, Microsoft)
