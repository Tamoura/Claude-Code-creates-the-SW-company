# ConnectIn: My Applications Feature

## Branch: feat/connectin/search (adding to existing PR #289)

## Summary
Add a "My Applications" endpoint and page so users can view all jobs
they've applied to, with status badges and applied dates.

## Backend Changes
- `jobs.service.ts`: `listMyApplications(userId, options?)` — cursor pagination
- `jobs.routes.ts`: `GET /api/v1/jobs/my-applications` (before /:id)
- `jobs.test.ts`: auth, empty, list, pagination, includes job details

## Frontend Changes
- `useMyApplications.ts` hook — fetch GET /jobs/my-applications
- `apps/web/src/app/(main)/jobs/applications/page.tsx` — applications page
- Jobs page: add "My Applications" link
- i18n keys in en/common.json and ar/common.json

## TDD Approach
1. RED: Write failing tests for GET /api/v1/jobs/my-applications
2. GREEN: Implement service method + route
3. REFACTOR: Clean up
4. Frontend: hook + page + i18n
