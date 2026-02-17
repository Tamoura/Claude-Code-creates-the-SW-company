# Command Center E2E Testing

## Branch: test/command-center/e2e-all-pages

## Scope
End-to-end tests for all 23 pages of Command Center using Playwright.

## Test Files
- `e2e/navigation.spec.ts` — Sidebar, routing, navigation
- `e2e/dashboard.spec.ts` — Overview, Health Scorecard, Alerts
- `e2e/portfolio.spec.ts` — Products, Product Detail, Agents, Agent Detail, Workflows, Dependencies
- `e2e/quality-ops.spec.ts` — Quality Gates, Audit Reports, Sprint Board, Agent Monitor
- `e2e/system.spec.ts` — Activity, Git Analytics, Knowledge Base, Components, Infrastructure, Operations, Invoke, Settings

## Architecture Notes
- Frontend: React 18 + Vite @ localhost:3113
- Backend: Fastify @ localhost:5009
- All data from filesystem (no DB)
- API prefix: /api/v1
- Vite proxies /api/ from 3113 to 5009

## Test Strategy
- Each page: verify heading, subtitle, key content loads
- Interactive elements: tabs, filters, navigation
- API integration: data renders correctly
- Edge cases: empty states (alerts), command execution (invoke)
