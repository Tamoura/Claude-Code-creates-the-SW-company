# AI Fluency Frontend Foundation (FRONTEND-01)

## Task
Build complete Next.js 14 App Router frontend foundation for ai-fluency product.

## Branch
`claude/claude-code-100x-playbook-wMf9a`

## Working Directory
`products/ai-fluency/apps/web/`

## Key Decisions
- Next.js 14 App Router (SSR/routing requirements)
- Port: 3118
- API base: http://localhost:5014/api/v1
- Jest (not Vitest) — as per brief
- TanStack Query for client-side caching
- React Hook Form + Zod for forms
- No localStorage for tokens (httpOnly cookies)

## Routes to Create
All of these MUST exist, no 404s:
- / (home/landing)
- /login
- /register
- /dashboard (protected)
- /assessment (protected)
- /assessment/[id]
- /assessment/[id]/complete
- /profile (protected)
- /profile/[sessionId]
- /learning (protected)
- /learning/[pathId]
- /learning/[pathId]/modules/[moduleId]
- /org/dashboard (protected, manager)
- /org/teams
- /org/templates
- /admin/organizations (admin only)
- /settings/profile (protected)
- /settings/privacy (GDPR)

## Security Requirements
- CSP headers in next.config.ts
- credentials: "include" on all API calls
- x-csrf-token header on mutations
- frame-ancestors 'none'

## Accessibility (WCAG 2.1 AA)
- Skip nav link as first body child
- aria-current="page" on active nav links
- htmlFor on all form labels
- Focus indicators

## TDD Tests Required
- [FRONTEND-01][AC-1] home page renders without errors
- [FRONTEND-01][AC-2] home page has a call-to-action button
- [FRONTEND-01][AC-3] home page is accessible (has main landmark)
- [FRONTEND-01][AC-4] header renders navigation links
- [FRONTEND-01][AC-5] active nav link has aria-current="page"
- [FRONTEND-01][AC-6] login form has email and password fields with labels
- [FRONTEND-01][AC-7] login form shows validation errors for empty submission

## Status
- [ ] Project structure created
- [ ] package.json
- [ ] next.config.ts (with CSP)
- [ ] tailwind.config.ts
- [ ] tsconfig.json
- [ ] jest.config.ts
- [ ] Root layout
- [ ] All pages created
- [ ] Components (Header, Sidebar, SkipNav, ProtectedRoute)
- [ ] UI components (Button, Input, Card)
- [ ] Hooks (useAuth, useApi)
- [ ] lib/api.ts, lib/i18n.ts
- [ ] types/index.ts
- [ ] Tests (at least 5 passing)
- [ ] Dev server starts on 3118
