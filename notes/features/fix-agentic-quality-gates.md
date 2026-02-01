# Fix Agentic Quality Gates + Full Stack StableFlow

## Status: In Progress

## Root Cause
The audit scored 92/100 on a product that doesn't run end-to-end. Tests pass in mock mode. "Coming Soon" pages sit on top of working backend endpoints.

### Gaps Found
1. `testing-gate-checklist.sh` line 217 warns about dev server but never starts it
2. `executor.sh` production gate greps for "health" in source code instead of calling endpoint
3. QA agent says "manually verify" but nothing enforces it
4. Audit analyzes code quality, not whether the product actually runs
5. No integration test starts frontend + backend + database together

## Execution Order
| # | What | Branch | Status |
|---|------|--------|--------|
| 1 | Fix agentic quality gates | fix/agentic-quality-gates | In Progress |
| 2 | Fix Docker + seed data | fix/stablecoin/docker-full-stack | Pending |
| 3 | Wire frontend to real backend | feature/stablecoin/real-api-integration | Blocked by #2 |
| 4 | Build API Keys + Webhooks pages | feature/stablecoin/api-keys-webhooks-ui | Blocked by #3 |
| 5 | Integration tests | feature/stablecoin/integration-tests | Blocked by #3 |
| 6 | Merchant demo app | feature/stablecoin/merchant-demo | Blocked by #3 |
| 7 | Blockchain guide | docs/stablecoin/blockchain-guide | Blocked by #2 |
