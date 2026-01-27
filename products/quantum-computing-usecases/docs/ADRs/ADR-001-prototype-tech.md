# ADR-001: Prototype Technology Stack

## Status
Accepted

## Context

We need to build a rapid prototype (2-4 hours) to validate the quantum computing use cases platform concept. The prototype must:

- Be functional enough to demonstrate core features (directory, filters, detail pages, comparison)
- Allow quick iteration based on user feedback
- Be deployable for real-world testing
- Minimize infrastructure complexity

The prototype is frontend-focused with no complex backend logic. Use case data is static and can be seeded as JSON files. The goal is validation, not production-scale implementation.

## Decision

### Core Stack

**Vite + React 18 + TypeScript**
- **Why Vite**: Lightning-fast dev server (<100ms hot reload), optimized for rapid prototyping
- **Why React**: Team familiarity, component reusability, robust ecosystem
- **Why TypeScript**: Type safety prevents runtime errors, improves dev speed with IntelliSense

**Tailwind CSS v3**
- Pre-configured utility classes for rapid UI development
- No custom CSS files needed for prototype
- Consistent design system out of the box
- Mobile-responsive by default

**React Router v6**
- Client-side routing (no server needed)
- Dynamic routes for use case detail pages
- URL-based state for filters and comparison

**Vitest + React Testing Library**
- Native Vite integration (fast test execution)
- Jest-compatible API (team familiarity)
- Component testing without complex setup

**Playwright (E2E)**
- Standard company stack
- Critical path testing only for prototype

### Data Layer

**Static JSON files** (no database)
- Use cases stored in `/src/data/usecases.json`
- Industries and categories in `/src/data/categories.json`
- No API layer - direct imports in components
- Validated with Zod schemas for type safety

### Deployment

**Vercel** (free tier)
- Zero-config deployment for Vite
- Automatic HTTPS and CDN
- Preview URLs for each commit
- No server costs for prototype

### Notable Deviations from Company Defaults

1. **Vite instead of Next.js**: For a static prototype, Vite's speed advantage (sub-second builds) outweighs Next.js benefits (SSR, API routes not needed)
2. **No backend**: Static JSON data eliminates Fastify/PostgreSQL setup (save ~1 hour)
3. **No Prisma/ORM**: No database = no ORM needed

## Consequences

### Positive

- **Fastest time-to-prototype**: Vite dev server starts in <1 second vs Next.js ~5-10 seconds
- **Simple deployment**: Single command to deploy, no server/database setup
- **Easy migration path**: If prototype succeeds, can migrate to Next.js + backend without rewriting UI components
- **Low maintenance**: Static site requires no ongoing infrastructure management
- **Cost-effective**: Vercel free tier covers prototype needs (100GB bandwidth)
- **Fast iteration**: JSON data changes don't require database migrations or API updates

### Negative

- **Not company default stack**: Engineers will need to learn Vite conventions (minimal learning curve)
- **Data limitations**: JSON files can't scale beyond ~100 use cases without performance issues
- **No dynamic features**: Can't add user accounts, comments, or personalization without major refactor
- **Migration cost**: If we scale up, need to rebuild data layer and add backend

### Neutral

- **Prototype-only decision**: This ADR explicitly applies to prototype phase only
- **Re-evaluation trigger**: If use case count exceeds 50 or we need user accounts, revisit tech stack

## Alternatives Considered

### Alternative 1: Next.js 14 + Static Generation
- **Pros**:
  - Company default stack
  - Better SEO out of the box
  - Built-in Image optimization
  - Easier to scale to full product
- **Cons**:
  - Slower dev server (5-10s startup vs <1s for Vite)
  - More configuration overhead for simple use case
  - Heavier initial bundle size (~100KB more)
- **Why rejected**: Speed advantage is minimal for static content, and prototype optimization trumps long-term scalability at this stage

### Alternative 2: Plain HTML/CSS/JS
- **Pros**:
  - Zero build step
  - Maximum simplicity
  - Fastest possible load times
- **Cons**:
  - No component reusability
  - Manual state management (filters, comparison)
  - No TypeScript safety
  - Harder to maintain and iterate
- **Why rejected**: Modern tooling (React, TypeScript) saves more time than it costs for a multi-page app with interactive features

### Alternative 3: Full Stack (Next.js + Fastify + PostgreSQL)
- **Pros**:
  - Production-ready architecture
  - No migration needed if prototype succeeds
  - Can add user features easily
- **Cons**:
  - 2-3 hours just for setup (database, API routes, Prisma schema)
  - Overkill for static content validation
  - Increased deployment complexity
- **Why rejected**: Premature optimization. Static prototype validates concept faster; backend can be added if needed.

## References

- [Vite Documentation](https://vitejs.dev/)
- [React Router v6 Documentation](https://reactrouter.com/)
- [Vercel Deployment Guide](https://vercel.com/docs)
- ConnectSW Company Standards (CLAUDE.md)
- Quantum Computing Use Cases Concept (CONCEPT.md)
