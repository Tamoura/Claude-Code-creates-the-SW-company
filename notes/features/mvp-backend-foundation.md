# ConnectIn MVP Backend Foundation

## Overview
Build the Fastify API server with core modules for ConnectIn MVP.

## Key Decisions
- Port: 5007 (backend), 3111 (frontend)
- DB: PostgreSQL on 5432 with test database `connectin_test`
- Using @connectsw/shared patterns (Logger, Prisma plugin)
- Reusing error classes from muaththir pattern
- Reusing pagination from muaththir pattern
- JWT auth with HS256 for MVP simplicity

## Modules
1. Health - basic health check
2. Auth - register, login, refresh, logout, verify email
3. Profile - CRUD, experience, skills
4. Connection - request lifecycle
5. Feed - posts, likes, comments

## TDD Approach
Writing tests first for each module, then implementing.

## Progress
- [ ] Project setup (package.json, tsconfig, jest config)
- [ ] Prisma schema
- [ ] Lib (errors, pagination, response helpers)
- [ ] Plugins (auth, cors, error-handler, rate-limiter, swagger)
- [ ] Health module
- [ ] Auth module
- [ ] Profile module
- [ ] Connection module
- [ ] Feed module
- [ ] Test suite
