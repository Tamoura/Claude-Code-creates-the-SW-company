# Product Delivery Checklist

Before presenting ANY product to CEO, ALL must be true.

This checklist is enforced by the Orchestrator at every CEO checkpoint.
Failure on any item blocks the checkpoint until resolved.

## Infrastructure

- [ ] `docker-compose up` (or `npm run dev`) starts all services without errors
- [ ] Backend `/health` returns HTTP 200 with all checks healthy
- [ ] Frontend loads at configured port without console errors
- [ ] All environment variables documented in `.env.example`

## Functionality

- [ ] Login/signup flow works end-to-end (not mock data)
- [ ] Every sidebar/nav link leads to a functional page (no "Coming Soon")
- [ ] Core user flow completes: [product-specific flow description]
- [ ] Error states are handled gracefully (invalid input, network errors)

## Quality Gates

- [ ] `.claude/scripts/smoke-test-gate.sh <product>` returns PASS
- [ ] `.claude/scripts/testing-gate-checklist.sh <product>` returns PASS
- [ ] `.claude/quality-gates/executor.sh testing <product>` returns PASS
- [ ] Integration tests pass against running stack
- [ ] All audit dimensions >= 8/10 **including Runability**

## Code Quality

- [ ] No placeholder/Coming Soon pages for features with backend endpoints
- [ ] Frontend connected to real backend (VITE_USE_MOCK_API=false or equivalent)
- [ ] All API endpoints accessible from frontend
- [ ] Production build succeeds without errors

## How to Use

The Orchestrator runs this checklist before every CEO checkpoint:

```bash
# Automated verification
.claude/scripts/smoke-test-gate.sh <product-name>

# If PASS: proceed to checkpoint
# If FAIL: route to appropriate engineer, fix, re-test
```

Items that cannot be automated (e.g., "core user flow completes") must be
verified by the QA Engineer and reported in the Testing Gate output.
