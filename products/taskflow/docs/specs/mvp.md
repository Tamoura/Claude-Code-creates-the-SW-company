# Feature Specification: TaskFlow MVP

**Product**: taskflow
**Feature Branch**: `feature/taskflow/mvp`
**Created**: 2026-02-12
**Status**: Approved
**Input**: CEO brief: "Task Manager — simple task/todo app with CRUD, auth, and dashboard"

## User Scenarios & Testing

### User Story 1 - Register and Login (Priority: P1)

A new user visits TaskFlow, creates an account with email and password, then logs in to access their personal task dashboard.

**Why this priority**: Without auth, no other feature works. This is the foundation.

**Independent Test**: Can be fully tested by registering a new user, logging in, and verifying the dashboard loads with the user's email displayed.

**Acceptance Scenarios**:

1. **Given** no account exists, **When** user submits valid email + password (8+ chars), **Then** account is created and user is redirected to dashboard
2. **Given** account exists, **When** user logs in with correct credentials, **Then** JWT is issued and dashboard loads
3. **Given** account exists, **When** user logs in with wrong password, **Then** 401 error shown, no JWT issued
4. **Given** user is logged in, **When** user clicks "Sign Out", **Then** JWT is cleared and user is redirected to login page

---

### User Story 2 - Create and View Tasks (Priority: P1)

A logged-in user creates tasks with a title and optional description, then sees them listed on their dashboard.

**Why this priority**: Core value proposition — task management.

**Independent Test**: Can be tested by creating 3 tasks with different titles and verifying all 3 appear in the task list.

**Acceptance Scenarios**:

1. **Given** user is on dashboard, **When** user enters task title and clicks "Add Task", **Then** task appears in the list immediately
2. **Given** user has 5 tasks, **When** user loads dashboard, **Then** all 5 tasks are displayed with titles and creation dates
3. **Given** user creates a task, **When** task is saved, **Then** it persists across page reloads

---

### User Story 3 - Update and Delete Tasks (Priority: P1)

A logged-in user can mark tasks as complete, edit task details, and delete tasks they no longer need.

**Why this priority**: CRUD completeness is essential for a task manager.

**Independent Test**: Can be tested by creating a task, toggling its completion status, editing its title, and then deleting it.

**Acceptance Scenarios**:

1. **Given** task exists, **When** user clicks the checkbox, **Then** task is marked complete with visual strikethrough
2. **Given** task exists, **When** user edits the title and saves, **Then** updated title is displayed
3. **Given** task exists, **When** user clicks delete, **Then** task is removed from the list and database
4. **Given** completed task exists, **When** user unchecks it, **Then** task returns to active state

---

### User Story 4 - Dashboard Statistics (Priority: P2)

The dashboard shows summary statistics: total tasks, completed tasks, and pending tasks.

**Why this priority**: Nice-to-have analytics on top of core CRUD.

**Independent Test**: Can be tested by creating 5 tasks, completing 2, and verifying the dashboard shows "5 total, 2 completed, 3 pending".

**Acceptance Scenarios**:

1. **Given** user has tasks, **When** dashboard loads, **Then** stat cards show total, completed, and pending counts
2. **Given** user completes a task, **When** stats refresh, **Then** completed count increments and pending decrements

---

### Edge Cases

- What happens when user creates a task with empty title? → Validation error, task not created
- What happens when user creates a task with 500+ character title? → Truncated or rejected with max length error
- What happens when two users exist? → Each user sees only their own tasks (data isolation)
- What happens when user deletes all tasks? → Dashboard shows empty state with "No tasks yet" message

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow user registration with email + password
- **FR-002**: System MUST authenticate users via JWT tokens
- **FR-003**: System MUST support CRUD operations on tasks (create, read, update, delete)
- **FR-004**: System MUST isolate tasks by user (user A cannot see user B's tasks)
- **FR-005**: System MUST display dashboard statistics (total, completed, pending)
- **FR-006**: System MUST validate task title is non-empty and <= 200 characters
- **FR-007**: System MUST hash passwords before storing (bcrypt)

### Non-Functional Requirements

- **NFR-001**: Performance — API response time < 200ms (P95) for all CRUD operations
- **NFR-002**: Security — JWT tokens expire after 24 hours
- **NFR-003**: Security — Passwords stored as bcrypt hashes (cost factor >= 10)
- **NFR-004**: Accessibility — All forms keyboard navigable, ARIA labels present

### Key Entities

- **User**: id (UUID), email (unique), passwordHash, createdAt, updatedAt
- **Task**: id (UUID), title (string, max 200), description (text, nullable), completed (boolean, default false), userId (FK to User), createdAt, updatedAt

## Component Reuse Check

| Need | Existing Component | Reuse? |
|------|-------------------|--------|
| JWT Auth | Auth Plugin (stablecoin-gateway) | Yes — copy and adapt |
| Password Hashing | Crypto Utils (stablecoin-gateway) | Yes — copy hashPassword |
| Error Handling | AppError class (stablecoin-gateway) | Yes — copy directly |
| API Client | ApiClient (stablecoin-gateway web) | Yes — adapt for taskflow |
| Dockerfile | Multi-stage Dockerfile template | Yes — copy from registry |
| Playwright Config | E2E config (stablecoin-gateway) | Yes — adapt ports |

## Success Criteria

### Measurable Outcomes

- **SC-001**: User can register, login, create/edit/delete tasks, and view stats in under 60 seconds
- **SC-002**: All 4 user stories have passing E2E tests
- **SC-003**: Zero orphaned task records after user operations
- **SC-004**: API response times < 200ms (P95)
- **SC-005**: 80%+ test coverage on backend and frontend

## Out of Scope

- Task categories/labels (future iteration)
- Task due dates and reminders (future iteration)
- Task sharing between users (future iteration)
- Mobile app (future iteration)
- Real-time updates via WebSocket (future iteration)
