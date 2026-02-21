# Per-Product Progress Tracking

## Feature
Added a Progress page per product in the Command Center, showing sprint tasks, user stories, and GitHub issues.

## Files Created
- `products/command-center/apps/api/src/services/progress.service.ts` — Parses tasks.md, specs/*.md, GitHub issues
- `products/command-center/apps/api/src/routes/v1/progress.ts` — GET /api/v1/products/:name/progress
- `products/command-center/apps/web/src/pages/ProductProgress.tsx` — Progress dashboard with 3 tabs

## Files Modified
- `apps/api/src/app.ts` — Registered progress route
- `apps/web/src/App.tsx` — Added /products/:name/progress route
- `apps/web/src/pages/ProductDetail.tsx` — Added "View Progress" button in sidebar header

## Data Sources
- Sprint/task data: `products/{name}/docs/tasks.md`
- User stories: `products/{name}/docs/specs/*.md`
- GitHub issues: `gh issue list` CLI (with fallback to empty array)
- Story implementation status: cross-referenced via FR-XXX traceability codes

## API Response
GET /api/v1/products/:name/progress returns:
- `sprints[]` — name, status, tasks with progress bars
- `stories[]` — id, title, asA/iWant/soThat, acceptance criteria, implemented flag
- `issues[]` — number, title, state, labels (from GitHub)
- `summary` — aggregate counts for stat cards

## Testing
- connectgrc: 6 sprints, 42 tasks (23 done), 4 stories (all implemented)
- muaththir: 5 sprints, 31 tasks (22 done), 4 stories
- archforge (no tasks.md): returns empty arrays gracefully
- TypeScript: zero errors on both api and web
