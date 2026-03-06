# DOCS-01: ConnectGRC Foundation Documentation

## Task
Create comprehensive foundation documentation for ConnectGRC.

## Files to Create/Update
1. `products/connectgrc/README.md` - Updated with corrected ports and links
2. `products/connectgrc/docs/API.md` - Full API reference
3. `products/connectgrc/docs/ARCHITECTURE.md` - C4 diagrams, ER diagram
4. `products/connectgrc/docs/DEPLOYMENT.md` - Docker, env vars, production checklist

## Key Findings from Code Review
- Backend port: 5006 (config.ts default), mapped to 5006 in docker-compose
- Frontend port: 3110 (web Dockerfile, docker-compose, ALLOWED_ORIGINS default)
- README currently says port 3100 for frontend and 5004 for backend - WRONG
- 10 route modules: health, auth, profile, assessments, questions, jobs, career, resources, notifications, admin
- 18 Prisma models
- Auth: JWT (HS256) + API key fallback, refresh token rotation
- Pagination: offset-based (page/limit) via parsePagination utility
- Error codes: VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, BAD_REQUEST, CONFLICT, INTERNAL_ERROR

## Port Correction
The README had old ports (3100/5004). Corrected to 3110/5006 based on:
- `config.ts` line 9: PORT default is 5006
- `apps/web/.env.example`: PORT=3110
- `docker-compose.yml`: maps 5006:5006 and 3110:3110
- `apps/api/Dockerfile`: EXPOSE 5006
- `apps/web/Dockerfile`: EXPOSE 3110, PORT=3110
