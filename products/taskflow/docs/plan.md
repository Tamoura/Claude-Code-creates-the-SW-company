# Implementation Plan: TaskFlow MVP

**Product**: taskflow
**Branch**: `feature/taskflow/mvp`
**Created**: 2026-02-12
**Spec**: `products/taskflow/docs/specs/mvp.md`

## Summary

Build a task management app with user auth (JWT), CRUD tasks, and dashboard stats. Exercises all ConnectSW enhancements: spec-kit pipeline, development-oriented testing, dynamic test generation, and database state verification.

## Technical Context

- **Language/Version**: TypeScript 5+ / Node.js 20+
- **Backend**: Fastify + Prisma + PostgreSQL 15
- **Frontend**: Next.js 14+ / React 18+ / Tailwind CSS
- **Testing**: Jest + Playwright
- **Assigned Ports**: Frontend 3110 / Backend 5007

## Constitution Check

| Article | Requirement | Status |
|---------|------------|--------|
| I. Spec-First | Specification exists (specs/mvp.md) | PASS |
| II. Component Reuse | COMPONENT-REGISTRY.md checked (6 components reused) | PASS |
| III. TDD | Test plan defined (tests before implementation) | PASS |
| IV. TypeScript | TypeScript configured (strict mode) | PASS |
| V. Default Stack | Fastify + Next.js + PostgreSQL + Prisma | PASS |
| VII. Port Registry | Ports assigned: 3110 (web), 5007 (api) | PASS |

## Component Reuse Plan

| Need | Existing Component | Source Product | Action |
|------|-------------------|---------------|--------|
| JWT Auth | Auth Plugin | stablecoin-gateway | Adapt (simplify for demo) |
| Password Hashing | Crypto Utils | stablecoin-gateway | Copy hashPassword/verifyPassword |
| Error Handling | AppError | stablecoin-gateway | Copy directly |
| API Client | ApiClient | stablecoin-gateway web | Adapt for taskflow API |
| Dockerfile | Multi-stage template | COMPONENT-REGISTRY | Copy and configure |
| Playwright Config | E2E config | COMPONENT-REGISTRY | Adapt ports |

## Data Model

### User
```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  tasks        Task[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### Task
```prisma
model Task {
  id          String   @id @default(uuid())
  title       String   @db.VarChar(200)
  description String?  @db.Text
  completed   Boolean  @default(false)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## API Contracts

### Auth
- `POST /api/v1/auth/register` — `{ email, password }` → `{ user, token }`
- `POST /api/v1/auth/login` — `{ email, password }` → `{ user, token }`

### Tasks (all require `Authorization: Bearer <token>`)
- `GET /api/v1/tasks` — → `{ tasks: Task[] }`
- `POST /api/v1/tasks` — `{ title, description? }` → `{ task: Task }`
- `PUT /api/v1/tasks/:id` — `{ title?, description?, completed? }` → `{ task: Task }`
- `DELETE /api/v1/tasks/:id` — → `{ success: true }`

### Dashboard
- `GET /api/v1/tasks/stats` — → `{ total, completed, pending }`

## Complexity Tracking

| Decision | Violation of Simplicity? | Justification | Simpler Alternative Rejected |
|----------|------------------------|---------------|------------------------------|
| JWT auth | No | Required for user isolation (FR-004) | Session cookies (more complex for API) |
| Prisma ORM | No | ConnectSW standard (Article V) | Raw SQL (less type-safe) |
| Next.js | No | ConnectSW standard (Article V) | Vite (less SSR support) |
