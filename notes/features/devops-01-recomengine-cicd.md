# DEVOPS-01: RecomEngine CI/CD Pipeline and Docker Infrastructure

## Task
Set up CI/CD pipeline and Docker infrastructure for RecomEngine.

## Decisions
- Reused existing CI workflow pattern from connectgrc-ci.yml
- Split lint into separate api/web jobs (api needs prisma generate for typecheck)
- Added Docker build validation as a CI job using docker/build-push-action
- Security audit runs against both api and web workspaces via matrix
- Used `pnpm audit --prod` (NOT --omit=dev) per known-issues CI-002 pattern
- Used `pnpm run --if-present lint` (flag before script name)
- Downgraded actions/checkout from v6 to v4 for stability
- docker-compose uses ${VAR:-default} pattern for all env vars

## Files Changed
- `.github/workflows/recomengine-ci.yml` - Updated CI workflow
- `products/recomengine/apps/api/Dockerfile` - New, multi-stage build
- `products/recomengine/apps/web/Dockerfile` - New, multi-stage build
- `products/recomengine/docker-compose.yml` - Updated with api/web services
- `products/recomengine/.env.example` - New, documents all env vars
