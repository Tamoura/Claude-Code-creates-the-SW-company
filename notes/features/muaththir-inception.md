# Mu'aththir -- Product Inception Notes

## Product Concept
A holistic child development platform for parents tracking children ages 3-16 across 6 dimensions.

## Name
- **Arabic**: Mu'aththir
- **Meaning**: Influential / Impactful
- **Product slug**: `muaththir`

## 6 Development Dimensions
1. **Academic** -- School/learning progress, grades, milestones
2. **Social-Emotional** -- Emotional intelligence, social skills, empathy
3. **Behavioural** -- Conduct, habits, discipline, self-regulation
4. **Aspirational** -- Goals, dreams, motivation, career exploration
5. **Islamic** -- Islamic education, Quran progress, values, spiritual growth
6. **Physical** -- Health, fitness, motor skills, sports, nutrition

## Target Users
- **Primary**: Parents
- **Age range**: Children 3-16 years old
- **Audience**: Muslim families (primarily), but dimensions 1-4 and 6 are universal

## Port Assignments
- Frontend (web): 3108
- Backend (API): 5005

## Branch
- `feature/muaththir/inception`

## Current Phase
- PRD-01: COMPLETE (CEO approved)
- ARCH-01: COMPLETE (CEO checkpoint)
- DEVOPS-01: COMPLETE (CI/CD pipeline + Docker)
- BACKEND-01: COMPLETE (Fastify 5.x + auth + 28 tests)
- FRONTEND-01: COMPLETE (Next.js 14 + 41 pages + 38 tests)
- QA-01: COMPLETE (Playwright E2E framework + 24 tests)
- DOCS-01: COMPLETE (README + API docs)
- QA-02: PASS (66 unit/integration tests + build verified)
- CHECKPOINT-FOUNDATION: COMPLETE

## Frontend Foundation (FRONTEND-01)
- 37 pages built (all routes from site map, zero 404s)
- 38 tests passing (6 test suites)
- Next.js 14 + React 18 + Tailwind CSS
- Recharts radar chart (dynamically imported)
- Dimension colours/icons as constants
- Mobile-responsive, accessible, Arabic-ready fonts
- Token Manager (XSS-safe, copied from registry)
- useAuth hook (adapted from registry)

## Key Decisions
- Age bands: 3-5 (Early Years), 6-9 (Primary), 10-12 (Upper Primary), 13-16 (Secondary)
- Islamic dimension woven throughout, not siloed
- MVP focuses on single-child view; multi-child is Phase 2
- Radar/spider chart is the signature visualization
- Observations are the primary data input mechanism
- Milestones are age-appropriate and dimension-specific
- Database name: muaththir_dev

## Design Philosophy
The Islamic dimension is NOT separate -- it is woven throughout:
- Ihsan (excellence) connects to academic goals
- Sabr (patience) connects to behavioural tracking
- Shukr (gratitude) connects to social-emotional
- Tawakkul (reliance on Allah) connects to aspirational

## Architecture Decisions
- **Fastify 5.x + Prisma 6.x** (aligns with InvoiceForge, greenfield = latest)
- **Recharts 2.x** for radar/spider chart (React-native, SVG, accessible)
- **Radar cache**: PostgreSQL write-through with staleness flag (no Redis for MVP)
- **Milestone seed**: TypeScript data files + Prisma seed (240 milestones, UPSERT)
- **Image storage**: Local filesystem for MVP, S3 path documented for later
- **date-fns 3.x** for age band calculations
- **sharp** for image resizing (200x200)
- **Zod 3.x** for input validation

## Cross-Product Compatibility (Verified)
- Ports: 3108/5005 (no conflicts with Pulse 3106/5003 or InvoiceForge 3109/5004)
- Database: muaththir_dev (unique)
- Dependencies: isolated per product, no shared lockfile constraints
- CI: path-scoped workflows, no interference

## Deliverables

### Phase 1: PRD + Architecture
1. `products/muaththir/docs/PRD.md` (1,007 lines)
2. `products/muaththir/.claude/addendum.md` (420+ lines)
3. `products/muaththir/docs/architecture.md` (1,087 lines)
4. `products/muaththir/docs/api-schema.yml` (1,672 lines, OpenAPI 3.0)
5. `products/muaththir/docs/db-schema.sql` (285 lines)
6. `products/muaththir/docs/ADRs/001-tech-stack.md`
7. `products/muaththir/docs/ADRs/002-radar-chart-calculation.md`
8. `products/muaththir/docs/ADRs/003-milestone-data-model.md`
9. `products/muaththir/.claude/task-graph.yml`

### Phase 2: Foundation
10. `products/muaththir/apps/api/` -- Backend (Fastify 5.x, Prisma 6.x, auth, health)
11. `products/muaththir/apps/web/` -- Frontend (Next.js 14, 41 pages, radar chart)
12. `products/muaththir/e2e/` -- Playwright E2E tests (24 tests)
13. `products/muaththir/docker-compose.yml` -- Docker setup
14. `.github/workflows/muaththir-ci.yml` -- CI/CD pipeline
15. `products/muaththir/README.md` -- Project documentation
16. `products/muaththir/docs/API.md` -- API reference

## Test Summary
- Backend integration: 28/28 passing
- Frontend component: 38/38 passing
- E2E test suites: 3 (24 tests, require running servers)
- Build: Next.js production build succeeds (41 pages)
- TypeScript: Zero type errors
