# ADR-002: Tech Stack Selection

## Status
Accepted

## Context

We need to select a comprehensive technology stack for the ITIL Dashboard that:
- Supports rapid development with TypeScript
- Provides excellent developer experience
- Scales to handle 10,000+ records per entity
- Integrates well with our chosen component libraries
- Follows ConnectSW company standards

## Decision

### Frontend Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Framework** | Next.js | 14.x (App Router) | Server components, routing, API routes |
| **UI Library** | React | 18.x | Component model, concurrent features |
| **Language** | TypeScript | 5.x | Type safety, better DX |
| **Styling** | Tailwind CSS | 3.x | Utility-first, design system support |
| **Components** | shadcn/ui | Latest | Accessible, customizable |
| **Charts** | Tremor | 3.x | Dashboard visualizations |
| **Tables** | @tanstack/react-table | 8.x | Headless data grids |
| **Forms** | react-hook-form | 7.x | Performant form handling |
| **Validation** | Zod | 3.x | Schema validation |
| **Server State** | @tanstack/react-query | 5.x | Data fetching, caching |
| **Client State** | Zustand | 4.x | Simple global state |
| **Calendar** | react-big-calendar | 1.x | Change calendar |
| **Date/Time** | date-fns | 4.x | Date manipulation |
| **Icons** | Lucide React | Latest | Consistent iconography |

### Backend Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Runtime** | Node.js | 20.x LTS | Stable, long-term support |
| **Framework** | Fastify | 4.x | High performance, TypeScript support |
| **Language** | TypeScript | 5.x | Shared types with frontend |
| **ORM** | Prisma | 5.x | Type-safe database access |
| **Database** | PostgreSQL | 15+ | ACID compliance, JSON support |
| **Auth** | @fastify/jwt | Latest | JWT authentication |
| **Validation** | Zod | 3.x | Shared schemas |
| **Password** | bcrypt | Latest | Secure hashing |
| **CORS** | @fastify/cors | Latest | Cross-origin support |
| **Cookies** | @fastify/cookie | Latest | Session management |

### Testing Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Unit Tests** | Vitest | 1.x | Fast, ESM-native, Jest-compatible API |
| **Component Tests** | React Testing Library | 14.x | User-centric testing |
| **E2E Tests** | Playwright | 1.x | Cross-browser, reliable |
| **API Tests** | Vitest + Supertest | Latest | Backend integration |
| **Coverage** | c8/v8 | Latest | Native coverage |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| TypeScript | Type checking |
| Husky | Git hooks |
| lint-staged | Pre-commit linting |
| pnpm | Package management |
| Turborepo | Monorepo build system |

### Deployment Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **CI/CD** | GitHub Actions | Standard, integrated |
| **Hosting** | Vercel / Render | Easy deployment, preview envs |
| **Database** | Render PostgreSQL / Neon | Managed PostgreSQL |
| **Monitoring** | To be determined | Post-MVP consideration |

## Port Assignments

Following company standards:

| Service | Port |
|---------|------|
| Frontend (Next.js) | 3101 |
| Backend (Fastify) | 5001 |
| PostgreSQL | 5432 (default) |

## Project Structure

```
products/itil-dashboard/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   ├── components/           # React components
│   │   │   │   ├── ui/               # shadcn/ui components
│   │   │   │   ├── features/         # Feature components
│   │   │   │   └── layouts/          # Layout components
│   │   │   ├── hooks/                # Custom hooks
│   │   │   ├── lib/                  # Utilities
│   │   │   ├── stores/               # Zustand stores
│   │   │   └── types/                # TypeScript types
│   │   ├── tests/                    # Frontend tests
│   │   └── package.json
│   │
│   └── api/                          # Fastify backend
│       ├── src/
│       │   ├── routes/               # API routes
│       │   ├── services/             # Business logic
│       │   ├── plugins/              # Fastify plugins
│       │   ├── schemas/              # Zod schemas
│       │   ├── utils/                # Utilities
│       │   └── types/                # TypeScript types
│       ├── prisma/
│       │   ├── schema.prisma         # Database schema
│       │   └── migrations/           # Database migrations
│       ├── tests/                    # Backend tests
│       └── package.json
│
├── packages/
│   └── shared/                       # Shared code
│       ├── src/
│       │   ├── types/                # Shared types
│       │   ├── schemas/              # Shared Zod schemas
│       │   └── utils/                # Shared utilities
│       └── package.json
│
├── e2e/                              # Playwright E2E tests
├── docs/                             # Documentation
└── package.json                      # Monorepo root
```

## Consequences

### Positive

- **Type Safety**: Full TypeScript across the stack prevents runtime errors
- **Developer Experience**: Hot reload, good tooling, familiar patterns
- **Performance**: Next.js SSR/SSG, Fastify's speed, optimized queries
- **Maintainability**: Clear separation of concerns, shared types
- **Testing**: Comprehensive coverage with fast feedback loops
- **Ecosystem**: Large communities, excellent documentation

### Negative

- **Learning Curve**: Team needs familiarity with App Router, TanStack Query
- **Build Complexity**: Monorepo requires proper configuration
- **Bundle Size**: Must be vigilant about tree-shaking

### Neutral

- **Fastify vs Express**: Less ecosystem than Express, but faster and better TS support
- **Vitest vs Jest**: Similar API, some plugins may need alternatives

## Alternatives Considered

### Frontend Framework

#### Next.js (Pages Router)
- Pros: More documentation, familiar patterns
- Cons: Legacy approach, missing server components
- Why rejected: App Router is the future, better for this project

#### Remix
- Pros: Great data loading, form handling
- Cons: Smaller ecosystem, less corporate adoption
- Why rejected: Next.js has better shadcn/ui integration

#### Vite + React
- Pros: Faster dev server, simpler setup
- Cons: No SSR out of box, manual routing
- Why rejected: Next.js provides more value for dashboards

### Backend Framework

#### Express
- Pros: Largest ecosystem, most tutorials
- Cons: Slower, callback-based, less TypeScript-native
- Why rejected: Fastify is faster and more modern

#### NestJS
- Pros: Enterprise patterns, decorators
- Cons: Heavy, opinionated, more complexity
- Why rejected: Overkill for our needs

#### tRPC
- Pros: Type-safe API, no schemas needed
- Cons: Tight coupling, harder to document
- Why rejected: Want OpenAPI spec for documentation

### Database

#### MongoDB
- Pros: Flexible schema, JSON-native
- Cons: No ACID transactions, joins are complex
- Why rejected: ITIL data is relational

#### MySQL
- Pros: Widely used, mature
- Cons: Less JSON support, fewer modern features
- Why rejected: PostgreSQL is better for our use case

### Testing

#### Jest
- Pros: Most popular, huge ecosystem
- Cons: Slower, ESM issues, CJS-based
- Why rejected: Vitest is faster and ESM-native

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Fastify Documentation](https://www.fastify.io/docs/latest/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Vitest Documentation](https://vitest.dev/)
