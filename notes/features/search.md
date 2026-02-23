# Phase 2: Search Feature

## Branch: feat/connectin/search

## Goal
Users can find people, posts, and jobs. Single biggest functional gap.

## Architecture
- PostgreSQL full-text search via raw SQL (`to_tsvector` + `ts_rank`)
- No schema migration needed — use runtime `to_tsvector()` on existing columns
- Single unified endpoint: `GET /api/v1/search?q=&type=people|posts|jobs`
- Debounced search in TopBar with full results page

## Tasks
1. [ ] Search service (backend) — raw SQL full-text search
2. [ ] Search routes + schemas
3. [ ] Search integration tests
4. [ ] Register search routes in app.ts
5. [ ] Search UI page (frontend)
6. [ ] Wire TopBar search input
7. [ ] E2E tests

## Key Decisions
- Use raw SQL `to_tsvector('english', ...)` instead of Prisma tsvector columns
- This avoids schema conflicts with Phase 1 branch
- People search: matches on display_name, headline_en, headline_ar
- Posts search: matches on content
- Jobs search: matches on title, company, description
- Results capped at 20 per type

## Progress
- Starting with backend search service TDD
