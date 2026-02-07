# Pulse Risk Module (BACKEND-05)

## Branch
`feature/pulse/inception`

## Task
Build AI-powered sprint risk prediction module.

## Risk Scoring Algorithm (from addendum)

7 weighted factors, each scored 0-100:

| # | Factor | Weight | Threshold |
|---|--------|--------|-----------|
| 1 | Velocity trend (PRs merged vs sprint avg) | 25% | <70% of sprint avg pace |
| 2 | PR review backlog (open >24h without review) | 20% | >3 PRs waiting |
| 3 | Cycle time trend (vs 4-week avg) | 15% | >150% of 4-week avg |
| 4 | Commit frequency drop (vs sprint avg) | 15% | >40% drop day-over-day |
| 5 | Test coverage delta (vs sprint start) | 10% | >3% decrease |
| 6 | Large PR ratio (>500 lines) | 10% | >30% of open PRs |
| 7 | Review load imbalance (max/min reviews/person) | 5% | >3:1 ratio |

Overall = weighted sum, capped at 100.

## Risk Levels
- 0-33: low
- 34-66: medium
- 67-100: high

## Explanation Template
"Sprint risk is [score] ([level]). Top factors: [factor1] ([detail]), [factor2] ([detail]), [factor3] ([detail])."

## Endpoints
- GET /api/v1/risk/current?teamId=X
- GET /api/v1/risk/history?teamId=X&days=30

## Files to Create
- src/modules/risk/schemas.ts
- src/modules/risk/service.ts
- src/modules/risk/handlers.ts
- src/modules/risk/routes.ts
- tests/integration/risk.test.ts

## Existing Infrastructure
- RiskSnapshot model in Prisma (id, teamId, score, level, explanation, factors JSON, recommendations JSON, calculatedAt)
- buildApp() test helper with cleanDatabase()
- Auth plugin with JWT + authenticate decorator
- MetricsService pattern (PrismaClient in constructor)

## TDD Plan
1. Test: schemas validate correctly
2. Test: service computes individual risk factors
3. Test: service computes weighted score
4. Test: service generates explanation
5. Test: service stores risk snapshot
6. Test: GET /current returns risk
7. Test: GET /current returns 401 without auth
8. Test: GET /current returns 400 without teamId
9. Test: GET /history returns risk history
10. Test: GET /history respects days filter
11. Test: GET /history returns 401 without auth
12. Test: risk score is 0 when no data exists
13. Test: risk score reflects actual data patterns
