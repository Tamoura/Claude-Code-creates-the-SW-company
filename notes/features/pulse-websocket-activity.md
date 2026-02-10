# Pulse WebSocket Activity Broadcasting

## Task: BACKEND-03
## Branch: feature/pulse/inception

## Overview
Build real-time WebSocket activity broadcasting for Pulse developer
intelligence platform.

## Components
1. WebSocket Route - `/api/v1/activity/stream` (JWT auth)
2. Room Manager - Redis pub/sub room tracking
3. Event Publisher - Publish events to Redis channels
4. Connection Manager - Heartbeat, timeout, backpressure
5. Activity Feed REST - GET `/api/v1/activity` (cursor-based)

## Key Decisions
- @fastify/websocket with native ws (ADR-001)
- Redis pub/sub for cross-process (ADR-005)
- Room keys: `ws:team:{id}`, `ws:repo:{id}`
- Heartbeat: 30s ping, 60s timeout
- No mocks in tests - real DB, real app instance
- Tests: since Redis is disabled in test env, services use
  in-memory fallback maps for room/connection tracking

## Test Strategy
- Integration tests using buildApp() helper
- WebSocket tests use `ws` package (already in devDeps)
- Test auth, room sub/unsub, heartbeat, REST pagination
- At least 8 integration tests required

## Progress
- [ ] Schemas (Zod)
- [ ] Connection Manager service
- [ ] Room Manager service
- [ ] Event Publisher service
- [ ] WebSocket route + handler
- [ ] Activity Feed REST endpoint
- [ ] Integration tests (8+)
