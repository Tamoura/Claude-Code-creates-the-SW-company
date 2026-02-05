# ADR-001: Prototype Tech Stack

## Status
Accepted

## Context
Building a prototype API for Shariah compliance screening. Need to move fast while maintaining production-quality foundations by reusing ConnectSW components.

## Decision

### Backend: Fastify + TypeScript + Prisma + PostgreSQL
- Reuse entire ConnectSW backend-core (Auth, Redis, Prisma, Observability plugins)
- Port 5005 (per PORT-REGISTRY)
- Sample stock data seeded into PostgreSQL (no live data feeds for prototype)

### Frontend: React + Vite + Tailwind
- Developer dashboard only (not a consumer app)
- Port 3105 (per PORT-REGISTRY)
- Reuse: useAuth, TokenManager, ErrorBoundary, StatCard, Sidebar patterns

### Screening Engine: Rules-based with AI hooks
- Prototype: deterministic AAOIFI rules (debt ratio, revenue screen, etc.)
- Data: hardcoded S&P 500 subset with realistic financial data
- Architecture: screening logic isolated in service class for easy AI upgrade later

### No External Dependencies (prototype)
- No paid financial data APIs (use sample data)
- No Shariah board integration (hardcode AAOIFI rules)
- No payment processing (free API keys)

## Consequences
- Fast to build (reuse ~40% from existing components)
- Easy to upgrade to production (swap sample data for real APIs)
- Screening logic is isolated and testable
- Developer experience is the focus (API-first)
