# Deploy Pre-flight Gate

## Feature Summary
Add a pre-flight test gate to the production deployment workflow.
Tests and lint must pass before Docker images are built and pushed.

## Key Changes
- New test file: `products/stablecoin-gateway/apps/api/tests/ci/deploy-preflight.test.ts`
- Modified: `products/stablecoin-gateway/.github/workflows/deploy-production.yml`

## Requirements
1. deploy-production.yml must contain "Run API unit tests (pre-flight gate)" step
2. The test step must appear BEFORE the "Build API" step
3. The test step must have correct env vars: DATABASE_URL, REDIS_URL, JWT_SECRET, NODE_ENV, API_KEY_HMAC_SECRET
4. PostgreSQL and Redis services must be defined on the deploy job
5. A lint check step must exist

## TDD Phases
- RED: Write test asserting the above, confirm it fails
- GREEN: Edit deploy-production.yml, confirm test passes
- REFACTOR: Clean up if needed
