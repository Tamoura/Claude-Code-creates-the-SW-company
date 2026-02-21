# ConnectIn Infrastructure & CI/CD Fixes

## Tasks
1. Docker HEALTHCHECK for Web Dockerfile (API already has one)
2. Docker resource limits in docker-compose.yml
3. Dev-only port comments for db/redis
4. Fix hardcoded POSTGRES_PASSWORD with env var fallback
5. Remove --passWithNoTests from CI
6. Add coverage thresholds to Jest configs

## Files Modified
- products/connectin/apps/web/Dockerfile
- products/connectin/docker-compose.yml
- .github/workflows/connectin-ci.yml
- products/connectin/apps/api/jest.config.ts
- products/connectin/apps/web/jest.config.ts

## Notes
- API Dockerfile already has HEALTHCHECK on line 51-52
- Web Dockerfile is missing HEALTHCHECK
- docker-compose.yml has no resource limits
- POSTGRES_PASSWORD is hardcoded to 'postgres'
- --passWithNoTests found in test-web job line 177
- Neither jest config has coverageThreshold
