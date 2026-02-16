# Product Requirements Document: TaskFlow

**Product**: TaskFlow
**Version**: 1.0
**Status**: Approved (MVP Complete) / Phase 2 Planning
**Created**: 2026-02-12
**Last Updated**: 2026-02-16
**Author**: Product Manager (ConnectSW)
**Spec Reference**: `products/taskflow/docs/specs/mvp.md`

---

## 1. Overview

### 1.1 Product Summary

TaskFlow is a personal task management application that enables users to create, organize, and track their tasks through a clean web interface. It provides secure user authentication, full CRUD operations on tasks, and a dashboard with real-time statistics showing task completion progress.

### 1.2 Problem Statement

Individuals need a simple, secure, and fast way to manage their personal to-do lists without the overhead of enterprise project management tools. Existing solutions are either too complex (Jira, Asana) or lack authentication and data isolation (local-only tools). TaskFlow fills the gap as a lightweight, authenticated task manager with per-user data isolation.

### 1.3 Product Vision

Deliver a fast, accessible task management tool that starts simple (personal use) and evolves toward team collaboration, due dates, labels, and notifications in future phases.

### 1.4 Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **SC-001**: End-to-end task workflow time | < 60 seconds (register, login, create/edit/delete, view stats) | E2E test timing |
| **SC-002**: User story E2E coverage | All 4 user stories have passing E2E tests | Playwright test suite |
| **SC-003**: Data integrity | Zero orphaned task records after user operations | Database state verification |
| **SC-004**: API response time | < 200ms (P95) for all CRUD operations | Performance tests |
| **SC-005**: Test coverage | 80%+ on backend and frontend | Jest coverage reports |

---

## 2. Personas

### 2.1 Individual User (Primary - MVP)

**Name**: Alex, the Freelancer
**Background**: Self-employed professional juggling multiple clients and personal tasks. Needs a simple way to track what needs doing without enterprise overhead.

**Goals**:
- Quickly add tasks as they come up
- Mark tasks complete and see progress
- Access tasks from any device via web browser
- Keep tasks private and secure

**Pain Points**:
- Sticky notes get lost
- Spreadsheets are cumbersome for simple task lists
- Enterprise tools require team setup and are overly complex

**Technical Proficiency**: Moderate. Comfortable with web apps but not interested in configuration.

### 2.2 Team Lead (Phase 2)

**Name**: Sam, the Engineering Manager
**Background**: Manages a team of 5-8 engineers. Needs visibility into team task progress and the ability to assign tasks.

**Goals**:
- Assign tasks to team members
- Track team completion rates
- Filter tasks by assignee, status, or label
- Get notified when assigned tasks are completed

**Pain Points**:
- No visibility into what team members are working on
- Tasks fall through the cracks without reminders
- Difficult to prioritize without categorization

**Technical Proficiency**: High. Comfortable with developer tools.

### 2.3 Admin (Future)

**Name**: Jordan, the IT Administrator
**Background**: Manages organizational accounts, user access, and compliance requirements.

**Goals**:
- Manage user accounts (create, deactivate, reset passwords)
- View usage analytics across the organization
- Configure organization-wide settings
- Ensure compliance with data retention policies

**Pain Points**:
- No central user management
- Cannot enforce password policies
- No audit trail for administrative actions

**Technical Proficiency**: High. Expects admin dashboards and configuration panels.

---

## 3. Features

### 3.1 MVP Features (Phase 1 - COMPLETE)

#### F-001: User Registration

| Attribute | Value |
|-----------|-------|
| **Priority** | P1 |
| **Status** | Implemented |
| **User Story** | As an Individual User, I want to create an account with my email and password so that I have a private space for my tasks. |
| **API Endpoint** | `POST /api/v1/auth/register` |
| **Request Body** | `{ email: string, password: string }` |
| **Response (201)** | `{ token: string, user: { id, email, createdAt, updatedAt } }` |
| **Validation** | Email: valid format (Zod). Password: minimum 6 characters. |
| **Error Responses** | 400: Validation failed (invalid email or short password). 409: Email already registered. |
| **Implementation** | `apps/api/src/routes/auth/index.ts` |
| **Tests** | `apps/api/tests/integration/auth.test.ts` |

#### F-002: User Login

| Attribute | Value |
|-----------|-------|
| **Priority** | P1 |
| **Status** | Implemented |
| **User Story** | As a registered user, I want to log in with my credentials so that I can access my tasks. |
| **API Endpoint** | `POST /api/v1/auth/login` |
| **Request Body** | `{ email: string, password: string }` |
| **Response (200)** | `{ token: string, user: { id, email, createdAt, updatedAt } }` |
| **Validation** | Email: valid format. Password: non-empty. |
| **Error Responses** | 400: Validation failed. 401: Invalid email or password. |
| **Security** | Identical error message for wrong email and wrong password (prevents user enumeration). |
| **Implementation** | `apps/api/src/routes/auth/index.ts` |
| **Tests** | `apps/api/tests/integration/auth.test.ts` |

#### F-003: JWT Authentication

| Attribute | Value |
|-----------|-------|
| **Priority** | P1 |
| **Status** | Implemented |
| **User Story** | As a logged-in user, I want my session to persist across page reloads so that I do not need to log in repeatedly. |
| **Mechanism** | Bearer token in `Authorization` header. Token stored in `localStorage` on the client. |
| **Token Expiry** | 24 hours |
| **Token Payload** | `{ userId: string }` |
| **Client Storage Keys** | `taskflow_token` (JWT string), `taskflow_user` (JSON user object) |
| **Implementation** | `apps/api/src/plugins/auth.ts`, `apps/web/src/hooks/useAuth.ts` |

#### F-004: Sign Out

| Attribute | Value |
|-----------|-------|
| **Priority** | P1 |
| **Status** | Implemented |
| **User Story** | As a logged-in user, I want to sign out so that my session is cleared and my account is protected. |
| **Mechanism** | Client-side only. Clears `localStorage` keys and redirects to `/login`. |
| **Implementation** | `apps/web/src/hooks/useAuth.ts` (`logout` function) |

#### F-005: Create Task

| Attribute | Value |
|-----------|-------|
| **Priority** | P1 |
| **Status** | Implemented |
| **User Story** | As a logged-in user, I want to create a task with a title so that I can track what needs to be done. |
| **API Endpoint** | `POST /api/v1/tasks` (requires Bearer token) |
| **Request Body** | `{ title: string, description?: string }` |
| **Response (201)** | `{ task: { id, title, description, completed, createdAt, updatedAt } }` |
| **Validation** | Title: non-empty, max 200 characters. Description: optional string. |
| **Error Responses** | 400: Validation failed. 401: Missing or invalid token. |
| **Implementation** | `apps/api/src/routes/tasks/index.ts`, `apps/web/src/components/TaskForm.tsx` |
| **Tests** | `apps/api/tests/integration/tasks.test.ts` |

#### F-006: List Tasks

| Attribute | Value |
|-----------|-------|
| **Priority** | P1 |
| **Status** | Implemented |
| **User Story** | As a logged-in user, I want to see all my tasks so that I know what I need to work on. |
| **API Endpoint** | `GET /api/v1/tasks` (requires Bearer token) |
| **Response (200)** | `{ tasks: Task[] }` |
| **Sort Order** | Descending by `createdAt` (newest first) |
| **Data Isolation** | Returns ONLY tasks belonging to the authenticated user (FR-004). |
| **Implementation** | `apps/api/src/routes/tasks/index.ts`, `apps/web/src/components/TaskList.tsx` |

#### F-007: Update Task

| Attribute | Value |
|-----------|-------|
| **Priority** | P1 |
| **Status** | Implemented |
| **User Story** | As a logged-in user, I want to edit a task's title or mark it complete so that I can track my progress. |
| **API Endpoint** | `PUT /api/v1/tasks/:id` (requires Bearer token) |
| **Request Body** | `{ title?: string, description?: string | null, completed?: boolean }` |
| **Response (200)** | `{ task: Task }` |
| **Validation** | Title (if provided): non-empty, max 200 characters. Completed: boolean. |
| **Error Responses** | 400: Validation failed. 401: Missing or invalid token. 404: Task not found (or belongs to another user). |
| **Ownership Check** | Task must belong to the authenticated user. Returns 404 (not 403) to prevent information leakage. |
| **Implementation** | `apps/api/src/routes/tasks/index.ts`, `apps/web/src/components/TaskList.tsx` |

#### F-008: Delete Task

| Attribute | Value |
|-----------|-------|
| **Priority** | P1 |
| **Status** | Implemented |
| **User Story** | As a logged-in user, I want to delete a task so that I can remove items I no longer need. |
| **API Endpoint** | `DELETE /api/v1/tasks/:id` (requires Bearer token) |
| **Response (200)** | `{ message: "Task deleted successfully" }` |
| **Error Responses** | 401: Missing or invalid token. 404: Task not found. |
| **Ownership Check** | Same as F-007. |
| **UI Behavior** | Two-click delete: first click shows confirmation state (3-second timeout), second click confirms deletion. |
| **Implementation** | `apps/api/src/routes/tasks/index.ts`, `apps/web/src/components/TaskList.tsx` |

#### F-009: Dashboard Statistics

| Attribute | Value |
|-----------|-------|
| **Priority** | P2 |
| **Status** | Implemented |
| **User Story** | As a logged-in user, I want to see summary statistics (total, completed, pending) so that I can understand my productivity at a glance. |
| **API Endpoint** | `GET /api/v1/tasks/stats` (requires Bearer token) |
| **Response (200)** | `{ total: number, completed: number, pending: number }` |
| **Calculation** | `pending = total - completed`. Counts scoped to authenticated user only. |
| **Frontend** | Client-side calculation from task list (avoids extra API call on dashboard). Server endpoint exists for independent stat queries. |
| **Implementation** | `apps/api/src/routes/tasks/index.ts`, `apps/web/src/components/StatCards.tsx` |

#### F-010: Health Check Endpoint

| Attribute | Value |
|-----------|-------|
| **Priority** | P1 |
| **Status** | Implemented |
| **API Endpoint** | `GET /health` |
| **Response (200)** | `{ status: "healthy", timestamp: string (ISO 8601) }` |
| **Authentication** | None required |
| **Purpose** | Infrastructure monitoring, load balancer health checks, deployment readiness |
| **Implementation** | `apps/api/src/routes/health/index.ts` |

### 3.2 Phase 2 Features (Planned)

#### F-020: Task Labels / Tags

| Attribute | Value |
|-----------|-------|
| **Priority** | P2 |
| **Status** | Planned |
| **User Story** | As an Individual User, I want to tag tasks with labels (e.g., "work", "personal", "urgent") so that I can categorize and filter them. |
| **Data Model** | New `Label` entity: `{ id, name, color, userId }`. Many-to-many relationship with `Task`. |
| **API Endpoints** | `GET /api/v1/labels`, `POST /api/v1/labels`, `DELETE /api/v1/labels/:id`. Task endpoints extended with `labelIds` filter parameter. |
| **Acceptance Criteria** | User can create up to 20 labels. Each task can have up to 5 labels. Tasks can be filtered by label. Labels are user-scoped. |

#### F-021: Due Dates

| Attribute | Value |
|-----------|-------|
| **Priority** | P2 |
| **Status** | Planned |
| **User Story** | As an Individual User, I want to set due dates on tasks so that I can track deadlines and prioritize my work. |
| **Data Model** | Add `dueDate: DateTime?` to `Task`. |
| **API Changes** | `POST /api/v1/tasks` and `PUT /api/v1/tasks/:id` accept optional `dueDate` (ISO 8601 string). `GET /api/v1/tasks` supports `sortBy=dueDate` and `overdue=true` filter. |
| **Acceptance Criteria** | Due date displayed on task cards. Overdue tasks visually highlighted (red). Tasks sortable by due date. Dashboard shows overdue count in stats. |

#### F-022: Team Collaboration

| Attribute | Value |
|-----------|-------|
| **Priority** | P3 |
| **Status** | Planned |
| **User Story** | As a Team Lead, I want to create a team and share tasks with team members so that we can collaborate on work. |
| **Data Model** | New entities: `Team { id, name, ownerId }`, `TeamMember { teamId, userId, role }`. Task gains optional `teamId` and `assigneeId`. |
| **API Endpoints** | `POST /api/v1/teams`, `GET /api/v1/teams`, `POST /api/v1/teams/:id/members`, `GET /api/v1/teams/:id/tasks`. |
| **Acceptance Criteria** | Team owner can create team and invite members by email. Tasks can be assigned to team members. Team dashboard shows all team tasks. Members see both personal and team tasks. |

#### F-023: Notifications

| Attribute | Value |
|-----------|-------|
| **Priority** | P3 |
| **Status** | Planned |
| **User Story** | As a user, I want to receive notifications when tasks are due or assigned to me so that I do not miss important deadlines. |
| **Mechanism** | In-app notification bell (Phase 2a). Email notifications (Phase 2b). |
| **Triggers** | Task approaching due date (24h before). Task overdue. Task assigned to user. Task completed by assignee. |
| **Acceptance Criteria** | Unread notification count shown in header. Notification list accessible via dropdown. Notifications marked as read on click. Email notifications configurable (on/off). |

#### F-024: Task Search and Filter

| Attribute | Value |
|-----------|-------|
| **Priority** | P2 |
| **Status** | Planned |
| **User Story** | As an Individual User, I want to search and filter my tasks so that I can quickly find what I am looking for. |
| **API Changes** | `GET /api/v1/tasks` accepts query parameters: `q` (search title/description), `completed` (boolean filter), `labelId` (label filter), `sortBy` (createdAt, dueDate, title), `order` (asc, desc). |
| **Acceptance Criteria** | Search input filters tasks by title in real-time (client-side). Server-side search available for large datasets. Combined filters work together (AND logic). Empty results show appropriate message. |

### 3.3 Future Features (Backlog)

| Feature ID | Feature | Priority | Notes |
|-----------|---------|----------|-------|
| F-030 | Mobile App (React Native) | P4 | iOS and Android. Reuses API. |
| F-031 | Real-time Updates (WebSocket) | P4 | Live task updates for team collaboration. |
| F-032 | Task Recurring Schedules | P4 | Auto-create tasks on schedule (daily, weekly). |
| F-033 | File Attachments | P4 | Attach files to tasks. S3 storage. |
| F-034 | Activity Log / Audit Trail | P3 | Track all task changes with timestamps. |
| F-035 | Dark Mode | P3 | Theme toggle. CSS variables approach. |
| F-036 | Bulk Actions | P3 | Multi-select tasks for bulk complete/delete. |
| F-037 | Keyboard Shortcuts | P3 | Power user efficiency (n=new, e=edit, d=delete). |
| F-038 | Data Export (CSV/JSON) | P3 | User can export all tasks for backup. |
| F-039 | Admin Dashboard | P4 | User management, usage analytics, settings. |

---

## 4. Site Map

| Route | Page | Purpose | Key Elements | Auth Required |
|-------|------|---------|-------------|---------------|
| `/` | Root Redirect | Routes user to dashboard or login based on auth state | Loading spinner, redirect logic | No |
| `/login` | Login / Register | User authentication and account creation | Tab toggle (Sign In / Register), email input, password input, optional name field (register only), submit button, error display | No |
| `/dashboard` | Dashboard | Main application view; task management and statistics | Header (logo, user email, sign out button), stat cards (total/completed/pending), task form (title input, add button), task list (checkbox, title, edit/delete actions), empty state | Yes |

---

## 5. User Flows

### 5.1 New User Registration Flow

```
1. User navigates to /
2. System checks localStorage for token
3. No token found -> redirect to /login
4. User clicks "Register" tab
5. User enters email, password (optional: name)
6. Client validates: email format, password >= 6 chars
7. Client sends POST /api/v1/auth/register
8. Server validates email uniqueness
9. Server hashes password (bcrypt, cost factor 10)
10. Server creates User record
11. Server generates JWT (24h expiry)
12. Server returns { token, user }
13. Client stores token + user in localStorage
14. Client redirects to /dashboard
15. Dashboard loads and fetches GET /api/v1/tasks
16. Empty state displayed: "No tasks yet"
```

### 5.2 Returning User Login Flow

```
1. User navigates to /
2. System checks localStorage for token
3a. Token found -> redirect to /dashboard
3b. No token -> redirect to /login
4. User enters email and password in Sign In tab
5. Client sends POST /api/v1/auth/login
6. Server verifies credentials (bcrypt compare)
7. Server generates JWT
8. Client stores token + user in localStorage
9. Client redirects to /dashboard
10. Dashboard loads tasks and stats
```

### 5.3 Task Creation Flow

```
1. User is on /dashboard (authenticated)
2. User types task title in "What needs to be done?" input
3. User clicks "Add Task" or presses Enter
4. Client validates: title is non-empty (trimmed)
5. Client sends POST /api/v1/tasks { title }
6. Server validates: title non-empty, <= 200 chars
7. Server creates Task record with userId from JWT
8. Client refreshes task list (GET /api/v1/tasks)
9. New task appears at top of list (newest first)
10. Stat cards update (total increments, pending increments)
11. Input field clears for next task
```

### 5.4 Task Completion Toggle Flow

```
1. User clicks checkbox on a task
2. Client sends PUT /api/v1/tasks/:id { completed: true/false }
3. Server verifies task ownership
4. Server updates completed status
5. Client refreshes task list
6. Task appears with strikethrough (if completed) or normal (if uncompleted)
7. Stat cards update accordingly
```

### 5.5 Task Edit Flow

```
1. User clicks on task title (or edit icon)
2. Title becomes editable input (inline editing)
3. Input auto-focuses and selects current text
4. User modifies the title
5a. User presses Enter -> save edit
5b. User presses Escape -> cancel edit
5c. User clicks away (blur) -> cancel edit
6. Client sends PUT /api/v1/tasks/:id { title: newTitle }
7. Server validates and updates
8. Client refreshes task list
```

### 5.6 Task Deletion Flow

```
1. User hovers over task to reveal action buttons
2. User clicks delete icon (trash)
3. Button enters confirmation state (red highlight, 3-second timeout)
4. User clicks again to confirm
5. Client sends DELETE /api/v1/tasks/:id
6. Server verifies ownership and deletes
7. Client refreshes task list
8. Task removed from list
9. Stat cards update
10. If no tasks remain, empty state shown: "No tasks yet"
```

### 5.7 Sign Out Flow

```
1. User clicks "Sign Out" button in header
2. Client clears localStorage (taskflow_token, taskflow_user)
3. Client sets auth state to null
4. Client redirects to /login via window.location.href
5. Subsequent navigation to /dashboard redirects to /login
```

---

## 6. Requirements

### 6.1 Functional Requirements

| ID | Requirement | Priority | Status | Verification |
|----|------------|----------|--------|-------------|
| FR-001 | System MUST allow user registration with email and password | P1 | Implemented | `auth.test.ts`: register returns 201 + JWT |
| FR-002 | System MUST authenticate users via JWT tokens with 24-hour expiry | P1 | Implemented | `auth.test.ts`: login returns 200 + JWT |
| FR-003 | System MUST support CRUD operations on tasks (create, read, update, delete) | P1 | Implemented | `tasks.test.ts`: all CRUD operations |
| FR-004 | System MUST isolate tasks by user (user A cannot access user B's tasks) | P1 | Implemented | `tasks.test.ts`: user isolation test |
| FR-005 | System MUST display dashboard statistics (total, completed, pending) | P2 | Implemented | `tasks.test.ts`: stats endpoint test |
| FR-006 | System MUST validate task title is non-empty and <= 200 characters | P1 | Implemented | `tasks.test.ts`: empty title + over-length tests |
| FR-007 | System MUST hash passwords before storing using bcrypt (cost factor >= 10) | P1 | Implemented | `crypto.ts`: SALT_ROUNDS = 10 |
| FR-008 | System MUST prevent duplicate email registrations | P1 | Implemented | `auth.test.ts`: duplicate email returns 409 |
| FR-009 | System MUST return 401 for invalid credentials without revealing which field is wrong | P1 | Implemented | `auth.test.ts`: "Invalid email or password" |
| FR-010 | System MUST never return passwordHash in API responses | P1 | Implemented | `auth.test.ts`: passwordHash is undefined |
| FR-011 | System MUST return 404 (not 403) when accessing another user's task | P1 | Implemented | Ownership check in tasks routes |
| FR-012 | System MUST order tasks by creation date descending (newest first) | P2 | Implemented | `tasks.test.ts`: order verification |
| FR-013 | System MUST cascade-delete tasks when user record is deleted | P1 | Implemented | Prisma schema: `onDelete: Cascade` |
| FR-014 | System MUST provide a health check endpoint at GET /health | P1 | Implemented | `health.test.ts` |

### 6.2 Non-Functional Requirements

#### Performance

| ID | Requirement | Target | Measurement |
|----|------------|--------|-------------|
| NFR-001 | API response time for all CRUD operations | < 200ms (P95) | Load testing / Playwright timing |
| NFR-002 | Dashboard page load time (first contentful paint) | < 2 seconds | Lighthouse audit |
| NFR-003 | Database query time for task listing (up to 1000 tasks per user) | < 100ms | Prisma query logging |

#### Security

| ID | Requirement | Target | Measurement |
|----|------------|--------|-------------|
| NFR-004 | JWT token expiry | 24 hours | Token verification tests |
| NFR-005 | Password hash cost factor | bcrypt >= 10 rounds | Code review (`crypto.ts`: SALT_ROUNDS = 10) |
| NFR-006 | CORS configuration | Enabled with credentials | Server config (`@fastify/cors`) |
| NFR-007 | SQL injection prevention | Prisma parameterized queries | ORM usage (no raw SQL) |
| NFR-008 | No sensitive data in API responses | passwordHash never returned | Integration tests verify absence |

#### Scalability

| ID | Requirement | Target | Measurement |
|----|------------|--------|-------------|
| NFR-009 | Concurrent users | Support 100 concurrent authenticated users | Load testing (future) |
| NFR-010 | Tasks per user | Support up to 10,000 tasks per user without degradation | Query performance testing |
| NFR-011 | Database connection pooling | Prisma default pool (5 connections) | Prisma configuration |

#### Accessibility

| ID | Requirement | Target | Measurement |
|----|------------|--------|-------------|
| NFR-012 | Keyboard navigation | All forms and actions keyboard-accessible | Manual testing + Playwright |
| NFR-013 | ARIA labels | All interactive elements have ARIA labels | Code review |
| NFR-014 | Screen reader support | Role attributes on lists, alerts, tabs | Code review |
| NFR-015 | Color contrast | WCAG 2.1 AA compliance | Lighthouse audit |

#### Reliability

| ID | Requirement | Target | Measurement |
|----|------------|--------|-------------|
| NFR-016 | Test coverage | >= 80% on backend and frontend | Jest coverage reports |
| NFR-017 | Zero orphaned records | No tasks without valid userId after any operation | Database state verification tests |
| NFR-018 | Graceful error handling | All API errors return structured JSON responses | Integration tests |

---

## 7. Acceptance Criteria

### 7.1 User Story 1: Register and Login

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| AC-1.1 | Successful registration | No account exists for email | User submits valid email + password (6+ chars) | Account created, JWT returned, user redirected to dashboard |
| AC-1.2 | Successful login | Account exists | User logs in with correct credentials | JWT issued, dashboard loads with user email displayed |
| AC-1.3 | Wrong password | Account exists | User logs in with wrong password | 401 error shown, no JWT issued, message: "Invalid email or password" |
| AC-1.4 | Non-existent email | No account for email | User attempts login | 401 error shown, same message as wrong password |
| AC-1.5 | Duplicate email | Account exists for email | User attempts to register with same email | 409 error shown |
| AC-1.6 | Sign out | User is logged in | User clicks "Sign Out" | JWT cleared from localStorage, redirect to /login |
| AC-1.7 | Session persistence | User is logged in | User reloads the page | Dashboard reloads, user remains authenticated |
| AC-1.8 | Short password | Registration form open | User enters password < 6 characters | Client-side validation error shown |
| AC-1.9 | Invalid email format | Registration form open | User enters malformed email | Client-side validation error shown |

### 7.2 User Story 2: Create and View Tasks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| AC-2.1 | Create task | User is on dashboard | User enters task title and clicks "Add Task" | Task appears in list immediately, input clears |
| AC-2.2 | View all tasks | User has 5 tasks | User loads dashboard | All 5 tasks displayed with titles, newest first |
| AC-2.3 | Persistence | User creates a task | User reloads the page | Task still present in the list |
| AC-2.4 | Empty title rejected | User is on dashboard | User submits empty title | Error message: "Task title cannot be empty" |
| AC-2.5 | Title too long | User is on dashboard | User submits title > 200 characters | Error message from server validation |
| AC-2.6 | Data isolation | Two users exist, each with tasks | User A views tasks | Only User A's tasks are visible |

### 7.3 User Story 3: Update and Delete Tasks

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| AC-3.1 | Mark complete | Task exists, not completed | User clicks checkbox | Task marked complete with strikethrough, stats update |
| AC-3.2 | Mark incomplete | Task exists, completed | User unchecks checkbox | Task returns to active state, stats update |
| AC-3.3 | Edit title | Task exists | User clicks title, edits, presses Enter | Updated title displayed |
| AC-3.4 | Cancel edit | Task exists | User clicks title, presses Escape | Original title remains |
| AC-3.5 | Delete task | Task exists | User clicks delete, confirms | Task removed from list and database |
| AC-3.6 | Delete confirmation | Task exists | User clicks delete once | Button changes to confirmation state (3-second timeout) |
| AC-3.7 | Non-existent task update | User attempts to update deleted/non-existent task | PUT request sent | 404 error returned |
| AC-3.8 | Non-existent task delete | User attempts to delete non-existent task | DELETE request sent | 404 error returned |

### 7.4 User Story 4: Dashboard Statistics

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| AC-4.1 | Stats display | User has tasks | Dashboard loads | Stat cards show total, completed, and pending counts |
| AC-4.2 | Stats update on complete | User has 5 tasks, 2 completed | User completes another task | Completed: 3, Pending: 2, Total: 5 |
| AC-4.3 | Empty state | User has no tasks | Dashboard loads | Stats show 0/0/0, empty state message: "No tasks yet" |

---

## 8. Technical Architecture

### 8.1 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20+ |
| Language | TypeScript | 5+ |
| Backend Framework | Fastify | 4.26+ |
| Frontend Framework | Next.js | 14+ |
| UI Library | React | 18+ |
| Styling | Tailwind CSS | 3.4+ |
| Database | PostgreSQL | 15+ |
| ORM | Prisma | 5.11+ |
| Password Hashing | bcryptjs | 2.4+ |
| JWT | jsonwebtoken | 9.0+ |
| Validation | Zod | 3.22+ |
| Unit/Integration Tests | Jest | 29+ |
| E2E Tests | Playwright | latest |

### 8.2 Port Assignments

| Service | Port | URL |
|---------|------|-----|
| Frontend (Next.js) | 3111 | http://localhost:3111 |
| Backend (Fastify) | 5007 | http://localhost:5007 |
| Database (PostgreSQL) | 5432 | postgres://localhost:5432 |

### 8.3 Data Model

#### User

| Field | Type | Constraints | DB Column |
|-------|------|------------|-----------|
| id | UUID | Primary key, auto-generated | `id` |
| email | String | Unique, required | `email` |
| passwordHash | String | Required | `password_hash` |
| createdAt | DateTime | Auto-set on creation | `created_at` |
| updatedAt | DateTime | Auto-updated | `updated_at` |

#### Task

| Field | Type | Constraints | DB Column |
|-------|------|------------|-----------|
| id | UUID | Primary key, auto-generated | `id` |
| title | String | Required, max 200 chars (VARCHAR) | `title` |
| description | String | Optional (TEXT, nullable) | `description` |
| completed | Boolean | Default: false | `completed` |
| userId | UUID | Foreign key to User, indexed | `user_id` |
| createdAt | DateTime | Auto-set on creation | `created_at` |
| updatedAt | DateTime | Auto-updated | `updated_at` |

**Relationships**: User has many Tasks. Task belongs to User. Cascade delete: deleting a User deletes all associated Tasks.

### 8.4 API Route Summary

| Method | Route | Auth | Description | Response Code |
|--------|-------|------|-------------|--------------|
| GET | `/health` | No | Health check | 200 |
| POST | `/api/v1/auth/register` | No | Create account | 201, 400, 409 |
| POST | `/api/v1/auth/login` | No | Authenticate | 200, 400, 401 |
| GET | `/api/v1/tasks` | Yes | List user's tasks | 200, 401 |
| POST | `/api/v1/tasks` | Yes | Create task | 201, 400, 401 |
| PUT | `/api/v1/tasks/:id` | Yes | Update task | 200, 400, 401, 404 |
| DELETE | `/api/v1/tasks/:id` | Yes | Delete task | 200, 401, 404 |
| GET | `/api/v1/tasks/stats` | Yes | Task statistics | 200, 401 |

### 8.5 Project Structure

```
products/taskflow/
├── apps/
│   ├── api/                          # Backend service (Fastify)
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Database schema
│   │   ├── src/
│   │   │   ├── plugins/
│   │   │   │   ├── auth.ts           # JWT authentication plugin
│   │   │   │   ├── crypto.ts         # bcrypt password hashing
│   │   │   │   └── prisma.ts         # Prisma client plugin
│   │   │   ├── routes/
│   │   │   │   ├── auth/index.ts     # Register + Login endpoints
│   │   │   │   ├── health/index.ts   # Health check endpoint
│   │   │   │   └── tasks/
│   │   │   │       ├── index.ts      # CRUD + Stats endpoints
│   │   │   │       └── schemas.ts    # Zod validation schemas
│   │   │   └── server.ts             # Fastify app builder + entry point
│   │   ├── tests/
│   │   │   ├── setup.ts              # Test helpers (buildTestApp, resetDB)
│   │   │   └── integration/
│   │   │       ├── auth.test.ts      # Auth route tests (5 tests)
│   │   │       ├── health.test.ts    # Health route tests (1 test)
│   │   │       └── tasks.test.ts     # Task route tests (7 tests)
│   │   └── package.json
│   └── web/                          # Frontend app (Next.js)
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx        # Root layout
│       │   │   ├── page.tsx          # Root redirect (/ -> /login or /dashboard)
│       │   │   ├── login/page.tsx    # Login/Register page
│       │   │   └── dashboard/page.tsx # Main dashboard
│       │   ├── components/
│       │   │   ├── StatCards.tsx      # Statistics display cards
│       │   │   ├── TaskForm.tsx      # New task creation form
│       │   │   └── TaskList.tsx      # Task list with inline editing
│       │   ├── hooks/
│       │   │   └── useAuth.ts        # Authentication state management
│       │   └── lib/
│       │       └── api.ts            # API client (fetch wrapper)
│       └── package.json
├── e2e/                              # End-to-end tests
│   ├── playwright.config.ts          # Playwright configuration
│   └── tests/
│       ├── smoke.test.ts             # Smoke + auth + task E2E tests
│       └── dynamic-edge-cases.test.ts # Boundary, state, rapid interaction tests
├── docs/
│   ├── PRD.md                        # This document
│   ├── plan.md                       # Implementation plan
│   ├── tasks.md                      # Task tracking
│   ├── specs/
│   │   └── mvp.md                    # MVP specification
│   └── quality-reports/              # Test and quality gate reports
└── package.json                      # Root monorepo config (concurrently)
```

---

## 9. Out of Scope

The following items are explicitly NOT part of the current MVP and are deferred to future phases:

| Item | Phase | Rationale |
|------|-------|-----------|
| Task categories / labels / tags | Phase 2 | Core CRUD must be solid first |
| Task due dates and reminders | Phase 2 | Requires date picker UI and notification infrastructure |
| Task sharing between users / team collaboration | Phase 2 | Requires team data model and permission system |
| Notifications (in-app or email) | Phase 2 | Depends on team collaboration and due dates |
| Task search and filtering | Phase 2 | Current scope is small enough for manual scanning |
| Mobile app (iOS / Android) | Future | Web-first approach; mobile can reuse the API later |
| Real-time updates via WebSocket | Future | Not needed for single-user MVP |
| Recurring task schedules | Future | Nice-to-have, not core |
| File attachments on tasks | Future | Requires object storage (S3) |
| OAuth / social login (Google, GitHub) | Future | Email/password sufficient for MVP |
| Password reset / forgot password | Phase 2 | Requires email sending infrastructure |
| Admin dashboard / user management | Future | Not needed until multi-tenant |
| Dark mode / theme customization | Future | Cosmetic, not functional |
| Data export (CSV/JSON) | Future | Nice-to-have for data portability |
| Rate limiting / brute force protection | Phase 2 | Security hardening after MVP |
| Email verification | Phase 2 | Currently trust email at registration |
| Pagination on task list | Phase 2 | Current scope assumes < 100 tasks per user |

---

## 10. Risks and Mitigations

### 10.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **JWT secret in environment variable could leak** | Medium | High | Use strong, random secrets in production. Rotate keys periodically. Never commit secrets to version control. |
| **localStorage token vulnerable to XSS** | Medium | High | Implement Content Security Policy (CSP) headers. Sanitize all user inputs. Consider HttpOnly cookies in Phase 2. |
| **No rate limiting on auth endpoints** | High | Medium | Add rate limiting (e.g., `@fastify/rate-limit`) in Phase 2. Accept risk for MVP since no production deployment. |
| **Database connection pool exhaustion under load** | Low | High | Prisma default pool (5 connections) sufficient for MVP. Configure pool size for production. |
| **No input sanitization beyond Zod validation** | Low | Medium | Prisma ORM prevents SQL injection. Add XSS sanitization for Phase 2. |

### 10.2 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Feature creep in MVP** | Medium | Medium | Strict out-of-scope list. Phase 2 features documented but deferred. |
| **User adoption limited by lack of onboarding** | Medium | Low | MVP targets internal use / demo. Onboarding flow planned for Phase 2. |
| **Competition from established task managers** | High | Low | TaskFlow is an internal product for ConnectSW demonstration. Not competing commercially. |

### 10.3 User Adoption Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **No password recovery means locked-out users** | Medium | Medium | Implement forgot-password in Phase 2. Document limitation in MVP. |
| **No mobile support reduces daily usage** | Medium | Medium | Responsive design via Tailwind CSS provides acceptable mobile web experience. Native app in Future phase. |
| **No offline support** | Low | Low | Web-only app requires connectivity. Progressive Web App (PWA) considered for Future phase. |

---

## 11. Test Strategy Summary

### 11.1 Test Pyramid

| Level | Framework | Count | Scope |
|-------|-----------|-------|-------|
| Integration Tests | Jest + real PostgreSQL | 13 | Auth (5), Health (1), Tasks (7) |
| E2E Tests | Playwright (Chromium) | 14 | Smoke (3), Auth flow (5), Task CRUD (3), Edge cases (3) |
| Database State Verification | Jest | Included in integration | Cascade deletes, data isolation |

### 11.2 Test Categories

- **Smoke Tests**: Page loads, no console errors, unauthenticated redirect
- **Auth Tests**: Register, login, wrong credentials, duplicate email, sign out
- **CRUD Tests**: Create, read, update, delete tasks with ownership verification
- **Boundary Tests**: Empty title, max-length title, over-length title
- **State Transition Tests**: Complete/uncomplete toggle, delete-all-then-empty-state
- **Rapid Interaction Tests**: Double-click prevention, rapid sequential creates
- **Data Isolation Tests**: Multi-user scenarios verifying per-user data scoping

### 11.3 Running Tests

```bash
# All backend integration tests
cd products/taskflow && npm run test:api

# E2E tests (requires running frontend at :3111 and backend at :5007)
cd products/taskflow && npm run test:e2e

# All tests
cd products/taskflow && npm test
```

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| **JWT** | JSON Web Token. A compact, URL-safe token used for stateless authentication. |
| **CRUD** | Create, Read, Update, Delete. The four basic operations on data. |
| **bcrypt** | A password hashing function designed to be computationally expensive, preventing brute force attacks. |
| **Zod** | A TypeScript-first schema validation library used for request body validation. |
| **Prisma** | An ORM (Object-Relational Mapping) for Node.js and TypeScript that provides type-safe database access. |
| **Bearer Token** | An authentication scheme where the client sends a token in the `Authorization: Bearer <token>` header. |
| **Data Isolation** | Ensuring each user can only access their own data, enforced at the query level. |
| **Cascade Delete** | Automatic deletion of related records (tasks) when the parent record (user) is deleted. |

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-02-12 | 0.1 | Product Manager | Initial MVP spec (specs/mvp.md) |
| 2026-02-16 | 1.0 | Product Manager | Comprehensive PRD with all implemented features, Phase 2 roadmap, and full codebase documentation |
