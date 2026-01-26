# ADR-002: Technology Stack for Tech Management Helper

## Status
Accepted

## Context

Tech Management Helper is a GRC platform for Technology Managers in regulated industries. The platform requires:
- Dashboard with compliance metrics (< 3 second load with 10,000 assets)
- Complex data relationships (risks, controls, assets, frameworks)
- 7-year audit log retention
- RBAC (Admin, Manager, Analyst, Viewer roles)
- PDF report generation
- CSV import for assets
- 100 concurrent users

This ADR documents our technology choices, following ConnectSW defaults while justifying any deviations.

## Decision

### Frontend Stack

| Technology | Choice | Justification |
|------------|--------|---------------|
| Framework | **Next.js 14** (App Router) | Company default; server components for performance; built-in API routes for BFF pattern |
| Language | **TypeScript 5+** | Company standard; type safety critical for complex domain models |
| UI Components | **shadcn/ui + Radix** | Per ADR-001; accessible, customizable, MIT license |
| Styling | **Tailwind CSS 4** | Company default; utility-first, excellent DX |
| Charts | **Recharts** | Per ADR-001; React-native, composable |
| Tables | **TanStack Table** | Per ADR-001; handles 10K+ rows performantly |
| Forms | **React Hook Form + Zod** | Per ADR-001; type-safe validation |
| State | **React Query (TanStack Query)** | Server state management, caching, optimistic updates |

### Backend Stack

| Technology | Choice | Justification |
|------------|--------|---------------|
| Framework | **Fastify** | Company default; high performance (2x Express), TypeScript support |
| Language | **TypeScript 5+** | Company standard |
| ORM | **Prisma** | Company default; type-safe queries, migrations, excellent DX |
| Database | **PostgreSQL 15** | Company default; ACID compliance for audit data, JSONB for flexible framework data |
| Authentication | **NextAuth.js + Prisma Adapter** | Per ADR-001; session management, RBAC support |
| Authorization | **CASL** | Role-based access control with Prisma integration |
| PDF Generation | **@react-pdf/renderer** | Per ADR-001; complex report layouts |
| File Upload | **multer + S3/MinIO** | Industry standard for file handling |

### Infrastructure

| Technology | Choice | Justification |
|------------|--------|---------------|
| Containerization | **Docker** | Company standard; consistent environments |
| CI/CD | **GitHub Actions** | Company standard |
| Hosting - API | **Render** | Company standard; PostgreSQL add-on |
| Hosting - Web | **Vercel** | Optimal for Next.js; edge functions |
| Object Storage | **AWS S3 / MinIO** | Asset attachments, report storage |
| Monitoring | **Sentry** | Error tracking, performance monitoring |

### Testing Stack

| Technology | Choice | Justification |
|------------|--------|---------------|
| Unit Tests | **Jest** | Company standard |
| Component Tests | **React Testing Library** | Company standard |
| E2E Tests | **Playwright** | Company standard; cross-browser support |
| API Tests | **Supertest** | Industry standard for Fastify testing |
| Test Database | **Docker PostgreSQL** | Real database, no mocks per company policy |

## Architecture Rationale

### Why Next.js App Router over Pages Router

1. **Server Components**: Reduce client bundle size for dashboard; render framework data server-side
2. **Streaming**: Progressive dashboard loading for 3-second target
3. **Parallel Routes**: Complex layouts for GRC workflows
4. **Server Actions**: Form mutations without API routes for simple cases

### Why PostgreSQL over Other Databases

1. **ACID Compliance**: Critical for audit logs and compliance data
2. **7-Year Retention**: Native partitioning for efficient long-term storage
3. **JSONB**: Flexible storage for framework mappings (NIST, ISO, COBIT vary)
4. **Row-Level Security**: Future option for multi-tenancy
5. **Full-Text Search**: Control and asset search without ElasticSearch

### Why Fastify over Express

1. **Performance**: 2x throughput vs Express; critical for < 500ms API target
2. **TypeScript Native**: Better DX than Express
3. **Schema Validation**: Built-in JSON Schema validation
4. **Plugin Architecture**: Clean modular code organization

### Why Separate Frontend/Backend vs Full Next.js API

1. **Scalability**: Backend can scale independently
2. **Team Organization**: Clear separation of concerns
3. **Performance**: Fastify outperforms Next.js API routes
4. **Future Flexibility**: Backend can serve mobile app later

## Port Assignments

| Service | Port | Notes |
|---------|------|-------|
| Web (Next.js) | 3100 | Company standard (3100+) |
| API (Fastify) | 5001 | Company standard (5000+) |
| PostgreSQL | 5432 | Default |
| PostgreSQL (Test) | 5433 | Isolated test database |

## Development Dependencies

```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0",
    "@types/node": "^20.10.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0"
  }
}
```

## Alternatives Considered

### Alternative: Full-Stack Next.js (No Separate API)

**Pros:**
- Simpler deployment
- Single codebase
- Less infrastructure

**Cons:**
- API routes less performant than Fastify
- Harder to scale API independently
- Company standard is separate backend

**Why Rejected**: Performance requirements (< 500ms API response) and scalability needs favor separate backend.

### Alternative: tRPC Instead of REST

**Pros:**
- Type-safe end-to-end
- Less boilerplate

**Cons:**
- REST better for potential external API exposure
- Team more familiar with REST
- OpenAPI spec generation easier with REST

**Why Rejected**: REST with OpenAPI provides better documentation and potential for future API consumers.

### Alternative: Drizzle Instead of Prisma

**Pros:**
- Lighter weight
- SQL-like syntax
- Potentially faster

**Cons:**
- Less mature ecosystem
- Company standard is Prisma
- Migrations less robust

**Why Rejected**: Prisma is company standard with proven reliability.

## Consequences

### Positive
- Stack fully aligned with company standards
- Proven libraries with large communities
- Type safety throughout the stack
- Performance targets achievable
- Clear upgrade path as technologies evolve

### Negative
- Two codebases to maintain (web + api)
- Learning curve for App Router patterns
- Prisma cold start can affect serverless performance

### Neutral
- Standard patterns = standard tradeoffs
- Well-documented technologies reduce onboarding time

## Security Considerations

| Requirement | Implementation |
|-------------|----------------|
| TLS 1.2+ | Enforced at Vercel/Render edge |
| AES-256 at rest | PostgreSQL encryption + S3 SSE |
| Session management | NextAuth.js secure cookies |
| RBAC | CASL authorization middleware |
| Audit logging | Custom Prisma middleware |
| Input validation | Zod schemas on all inputs |
| SQL injection | Prisma parameterized queries |
| XSS | React auto-escaping + CSP headers |
| CSRF | NextAuth.js built-in protection |

## References

- ConnectSW CLAUDE.md standards
- Next.js 14 Documentation: https://nextjs.org/docs
- Fastify Documentation: https://www.fastify.io/docs/
- Prisma Documentation: https://www.prisma.io/docs
- ADR-001 Open Source Research (this product)

---

*Created by*: Architect Agent
*Date*: 2026-01-26
