# Pulse - AI-Powered Developer Intelligence Platform

## Status: Phase 1 - Inception

## Product Concept
Real-time dashboard connecting to GitHub repos for engineering leaders.
Visibility into team health, code quality trends, deployment velocity,
and AI-predicted sprint risks.

## MVP Features
1. GitHub OAuth connect and repo ingestion
2. Real-time commit/PR/deploy activity feed via WebSocket
3. Team velocity dashboard (PRs merged/week, cycle time, review time)
4. Code quality trends (test coverage over time)
5. AI sprint risk score with explanation
6. Mobile push notifications for anomalies

## Tech Stack
- Backend: Fastify + Prisma + PostgreSQL (port 5003)
- Frontend: Next.js 14 + React 18 + real-time charts (port 3106)
- Mobile: React Native (Expo)
- Real-time: WebSocket (fastify-websocket)
- Charts: TBD (recharts or chart.js - architect decides)

## Port Assignments
- Frontend: 3106
- Backend: 5003
- Mobile: 8081

## Task Graph
See: products/pulse/.claude/task-graph.yml

## Key Decisions
- (pending architect ADRs)

## Phase Timeline
- Phase 1: PRD (PRD-01) → CEO checkpoint
- Phase 2: Architecture (ARCH-01) → CEO checkpoint
- Phase 3: Foundation (DEVOPS-01 || BACKEND-01 || FRONTEND-01 || DATA-01)
- Phase 4: Core Features (parallel backend/frontend/mobile/security)
- Phase 5: Quality & Docs → CEO checkpoint
