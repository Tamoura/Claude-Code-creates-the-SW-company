# Feature Specification: Command Center — Core Features

**Product**: command-center
**Feature Branch**: `feature/command-center/core-mvp`
**Created**: 2026-02-21
**Status**: Accepted
**Version**: 1.0

## Business Context

### Problem Statement

ConnectSW is an AI-first software company with 14 specialist agents managing 10+ products. The CEO needs a single pane of glass to monitor product status, agent activity, code quality, and infrastructure health — without running dozens of terminal commands. No existing tool provides a unified view of an AI-agent-operated software company.

### Target Users

| Persona | Role | Pain Point | Expected Outcome |
|---------|------|-----------|-----------------|
| CEO | Company founder and operator | Can't see status of all products, agents, and pipelines at a glance | One dashboard showing everything: products, agents, activity, health |

### Business Value

- **Revenue Impact**: Internal tool — enables CEO to operate company 10x faster
- **Productivity**: Replaces 15+ manual CLI commands with one dashboard
- **Quality**: Surfaces quality gate results, health scores, and audit findings proactively
- **Strategic Alignment**: The CEO's primary interface with the entire company

## User Scenarios & Testing

### User Story 1 — Executive Dashboard (Priority: P1)

**As the** CEO, **I want to** see a single overview page with KPIs (product count, phase breakdown, recent activity, agent count), **so that** I can assess company health in 10 seconds.

**Acceptance Criteria**:

1. **Given** the CEO opens /overview, **When** the page loads, **Then** stat cards show total products, products by phase, active agents, and recent commit count
2. **Given** the dashboard, **When** the CEO views recent activity, **Then** the last 20 events (commits + audit trail entries) are shown in a unified timeline
3. **Given** a product's phase changes (e.g., Foundation → MVP), **When** the CEO refreshes, **Then** the phase breakdown updates automatically (filesystem-driven, no manual input)

### User Story 2 — Product Documentation Browser (Priority: P1)

**As the** CEO, **I want to** browse any product's documentation (PRD, architecture, API docs, ADRs) in a rich viewer with dark/light mode and PDF export, **so that** I can review deliverables without leaving the Command Center.

**Acceptance Criteria**:

1. **Given** the CEO navigates to a product, **When** they select a document, **Then** the markdown is rendered with syntax highlighting, tables, Mermaid diagrams, and code blocks
2. **Given** a rendered document, **When** the CEO toggles to fullscreen, **Then** the document fills the viewport with a toolbar for theme toggle and PDF export
3. **Given** any document, **When** the CEO clicks "Export PDF", **Then** a high-quality PDF is generated and downloaded

### User Story 3 — Command Invocation (Priority: P1)

**As the** CEO, **I want to** execute allowed commands (git, npm, docker, claude) from the Command Center with live streaming output, **so that** I can operate the company without switching to a terminal.

**Acceptance Criteria**:

1. **Given** the CEO enters a whitelisted command (e.g., "git status"), **When** they submit it, **Then** the output streams in real-time via SSE with auto-scroll
2. **Given** a non-whitelisted command, **When** the CEO tries to execute it, **Then** the system rejects it with a clear error explaining which commands are allowed
3. **Given** a running command, **When** the CEO views the job history, **Then** past commands are listed with their output, exit code, and duration

### User Story 4 — Per-Product Progress Tracking (Priority: P1)

**As the** CEO, **I want to** see per-product progress with sprint tasks, user stories, and GitHub issues, **so that** I can drill down into any product's development status.

**Acceptance Criteria**:

1. **Given** the CEO navigates to a product's progress page, **When** the page loads, **Then** sprints are displayed as accordions with progress bars and task checklists (done/in-progress/pending)
2. **Given** a product with user stories, **When** the CEO clicks the Stories tab, **Then** stories are shown with As-a/I-want/So-that format and expandable acceptance criteria
3. **Given** summary stats, **When** the CEO views the stat cards, **Then** task completion ratio, story implementation count, and open/closed issue counts are displayed

### User Story 5 — Health Scorecard (Priority: P2)

**As the** CEO, **I want to** see a health scorecard for each product (test coverage, doc completeness, security audit score, CI status), **so that** I can identify which products need attention.

**Acceptance Criteria**:

1. **Given** the CEO opens the health page, **When** the page loads, **Then** each product shows a composite health score with breakdown by dimension (tests, docs, security, CI)
2. **Given** a product with failing CI, **When** the scorecard updates, **Then** the CI dimension shows red with a link to the failing workflow
3. **Given** historical health data, **When** the CEO views trends, **Then** a sparkline shows score progression over the last 30 days

### User Story 6 — Quality Gates (Priority: P2)

**As the** CEO, **I want to** see quality gate results for each product (spec consistency, testing coverage, browser-first verification), **so that** I know which products are ready for release.

**Acceptance Criteria**:

1. **Given** the CEO opens the quality gates page, **When** the page loads, **Then** each product shows its latest gate results (PASS/FAIL) with timestamps
2. **Given** a failing quality gate, **When** the CEO clicks on it, **Then** the specific failures are listed with suggested remediation steps
3. **Given** a product that passes all gates, **When** the CEO reviews it, **Then** a "Release Ready" badge is displayed
