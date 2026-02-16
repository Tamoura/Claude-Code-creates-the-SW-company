# Command Center - Product Requirements Document

**Product**: ConnectSW Command Center
**Version**: 0.1.0
**Status**: Foundation
**Last Updated**: 2026-02-16
**Owner**: ConnectSW

---

## 1. Overview

### 1.1 Purpose

Command Center is ConnectSW's internal company management dashboard. It provides a single pane of glass for monitoring all products, AI agents, shared components, infrastructure, and development activity across the ConnectSW portfolio. It is the operational nerve center through which the CEO and Orchestrator observe, coordinate, and control the AI-first software company.

### 1.2 Problem Statement

ConnectSW operates as an AI-first software company with 10+ products, 16 specialist AI agents, 60+ shared components, and continuous git/audit activity. Without a centralized dashboard, understanding company health requires manually inspecting disparate data sources: filesystem directories, git logs, JSONL audit trails, port registries, CI pipeline configs, and agent definition files. This is unsustainable as the portfolio grows.

### 1.3 Solution

A read-only dashboard backed by a Fastify API that scans the monorepo filesystem in real time. No database is required -- all data is derived from the repository itself: directory structures, `package.json` files, `.claude/` agent definitions, `.claude/audit-trail.jsonl`, `PORT-REGISTRY.md`, `.github/workflows/`, and git history.

### 1.4 Key Metrics

| Metric | Target |
|--------|--------|
| Dashboard load time (Overview page) | < 2 seconds |
| API response time (all endpoints) | < 500ms |
| Data freshness (product cache TTL) | 30 seconds |
| Concurrent invoke jobs | 3 max |
| Invoke output buffer | 5,000 lines max per job |

---

## 2. Personas

### 2.1 CEO

**Role**: Company owner and strategic decision maker.
**Goals**: Understand overall company health at a glance, review product portfolio status, track development velocity, and invoke operational commands.
**Usage Pattern**: Daily check-ins via the Overview page. Periodic deep-dives into specific products via Product Detail. Occasional use of Invoke for git status checks.
**Key Needs**: High-level KPIs, phase breakdown, recent activity summary, quick access to product documentation.

### 2.2 Orchestrator Agent

**Role**: Central coordination agent that routes all work to specialist agents.
**Goals**: Determine which products exist, their current phase, what agents are available and their capabilities, and verify infrastructure port allocations before assigning work.
**Usage Pattern**: Programmatic API consumption. Queries `/api/v1/overview`, `/api/v1/products`, `/api/v1/agents`, and `/api/v1/infrastructure` to make routing decisions.
**Key Needs**: Structured JSON API responses, accurate phase detection, complete agent capability listings, port availability data.

### 2.3 Engineer (Human or Agent)

**Role**: Developer working on a specific product.
**Goals**: Check product status, review documentation inline, view recent commits, understand component library availability, and run diagnostic commands.
**Usage Pattern**: Uses Product Detail to review docs with Mermaid diagrams. Uses Component Library to check for reusable packages before building new ones. Uses Invoke to run git, npm, or docker commands.
**Key Needs**: Documentation viewer with syntax highlighting and Mermaid rendering, component registry visibility, safe command execution with live output streaming.

---

## 3. Site Map

| Route | Page | Purpose | Key Elements |
|-------|------|---------|--------------|
| `/` | Redirect | Redirects to `/overview` | `<Navigate to="/overview" replace />` |
| `/overview` | Executive Overview | Company health at a glance | KPI stat cards (Products, Packages, Agents, Files), Phase breakdown badges, Recent Activity feed, Recent Commits feed |
| `/products` | Products List | Browse all products in the portfolio | Product cards with display name, description, phase badge, capability tags (API/Web/Docker/CI), port numbers, file count, doc count; Links to detail pages |
| `/products/:name` | Product Detail | Deep-dive into a single product | Breadcrumb navigation, Product metadata (phase, doc count, ports), Categorized document sidebar (PRD/Architecture/API/Audit/ADR/Other), Collapsible categories, Document index grid, Inline Markdown viewer with light/dark theme toggle, Fullscreen document mode with Escape key exit |
| `/agents` | Agent Hub | View all 16 specialist AI agents | Agent cards with name, description, responsibilities (top 3 + overflow count), Training status badge, Performance stats (tasks completed, success rate) |
| `/components` | Component Library | Browse shared @connectsw/* packages | Summary stat cards (Packages, Total Files, With Prisma), Package table with name, location, description, Backend/Frontend/Prisma indicators, file count |
| `/activity` | Activity Feed | Unified audit trail and commit history | Chronological feed with type indicators (audit/commit), Commit hash badges, Author/product/agent metadata, Timestamps; Supports `?limit=` query param (max 100) |
| `/infrastructure` | Infrastructure | Port assignments and CI/CD pipelines | Stat cards (Frontend Ports, Backend Ports, CI Pipelines, Port Range), Port assignment grid with product name and color-coded port badges, CI pipeline list with filenames and associated products |
| `/invoke` | Invoke | Run commands with live output streaming | Quick command presets (Git: Status/Commits/Branches/Diff; Infra: Docker Status/Logs), Command input with `$` prompt prefix, Run/Cancel buttons, Terminal-style output area with auto-scroll, Job status badges, Job history table with command/timestamp/lines/exit code |

---

## 4. Features

### 4.1 MVP Features (Implemented)

#### F-01: Executive Overview Dashboard

**Description**: Displays company-wide KPIs and recent activity on a single page.

**User Story**: As the CEO, I want to see product count, agent count, package count, and total file count at a glance so that I can assess company scale without drilling into each product.

**Acceptance Criteria**:
- Given the Overview page loads, when the API responds, then 4 KPI stat cards are displayed: Products (with CI count sublabel), Shared Packages, AI Agents, Total Files.
- Given there are products in different lifecycle phases, when the Overview page loads, then a Phase Breakdown section shows badges (Production/MVP/Foundation/Planned) with counts.
- Given the audit trail file exists, when the Overview page loads, then the 5 most recent audit entries are displayed with summary, product, agent, and date.
- Given there are git commits in the repo, when the Overview page loads, then the 5 most recent commits are displayed with short hash, message, author, and date.
- Given the API is unreachable, when the page loads, then a red error message "Failed to load overview" is displayed.

#### F-02: Products Listing

**Description**: Displays all products in the monorepo as a browsable card grid.

**User Story**: As the CEO, I want to see all ConnectSW products with their status, capabilities, and port assignments so that I can understand the portfolio at a glance.

**Acceptance Criteria**:
- Given the Products page loads, when the API responds, then each product is shown as a card with display name, description, phase badge, capability tags (API/Web/Docker/CI), port numbers, and file count.
- Given a product has documentation files, when the card is rendered, then a doc count chip is shown next to the product name.
- Given the user clicks a product card, when the click is processed, then the browser navigates to `/products/:name`.
- Given the phase is Production, when the badge is rendered, then the badge uses the `success` (green) variant.
- Given the phase is MVP, when the badge is rendered, then the badge uses the `info` (blue) variant.
- Given the phase is Foundation, when the badge is rendered, then the badge uses the `warning` (amber) variant.

#### F-03: Product Detail and Documentation Viewer

**Description**: A two-panel view providing product metadata and an inline documentation reader with rich Markdown rendering.

**User Story**: As an Engineer, I want to read product documentation with proper formatting, syntax-highlighted code blocks, and rendered Mermaid diagrams without leaving the dashboard so that I can understand product architecture quickly.

**Acceptance Criteria**:
- Given the Product Detail page loads, when product data is available, then a breadcrumb trail (Products > Product Name) is shown at the top.
- Given the product has documentation files, when the page loads, then a left sidebar shows documents grouped by category (PRD, Architecture, API, Audit, ADR, Other) in a fixed importance order.
- Given an ADR category has more than 3 documents, when the sidebar renders, then the category is collapsible with a chevron toggle.
- Given no document is selected, when the page loads, then the main content area shows the product landing page with phase, document count, port cards, and a full document index.
- Given the user clicks a document in the sidebar, when the click is processed, then the main content area loads and displays the document's Markdown content.
- Given a document is displayed, when the user clicks the theme toggle, then the rendering switches between light and dark themes.
- Given a document is displayed, when the user clicks the fullscreen button, then the document fills the entire viewport with a sticky toolbar showing title, category badge, theme toggle, and "Esc to exit" label.
- Given the user is in fullscreen mode, when the Escape key is pressed, then fullscreen mode exits and returns to the normal two-panel view.
- Given a document contains a `mermaid` code block, when the document is rendered, then the Mermaid diagram is rendered as an SVG with the current theme.
- Given a document contains GFM tables, when the document is rendered, then the tables are rendered with alternating row colors, header styling, and hover effects.
- Given a Mermaid diagram fails to render, when the error occurs, then an error message and the raw chart source code are displayed in a red-bordered box.

#### F-04: Agent Hub

**Description**: Displays all specialist AI agents with their capabilities, responsibilities, and performance metrics.

**User Story**: As the Orchestrator, I want to see all available agents with their responsibilities and training status so that I can route tasks to the most suitable agent.

**Acceptance Criteria**:
- Given the Agents page loads, when the API responds, then each agent is shown as a card with name, description (2-line clamp), top 3 responsibilities (with overflow count), and training badge.
- Given an agent has an experience file in `.claude/memory/agent-experiences/`, when the card is rendered, then a green "Trained" badge is displayed.
- Given an agent has experience data, when the card is rendered, then tasks completed count and success rate percentage are shown below a divider.
- Given the API returns agents, when the page loads, then agents are sorted alphabetically by name.

#### F-05: Component Library

**Description**: Displays all shared `@connectsw/*` packages with their capabilities.

**User Story**: As an Engineer, I want to see all available shared packages with their backend/frontend/Prisma capabilities so that I can reuse existing components instead of rebuilding from scratch.

**Acceptance Criteria**:
- Given the Components page loads, when the API responds, then 3 summary stat cards are shown: Packages count, Total Files count, With Prisma count.
- Given packages are loaded, when the page renders, then a table is displayed with columns: Package (name + location), Description, Backend (checkmark or dash), Frontend (checkmark or dash), Prisma (checkmark or dash), Files (count).
- Given a package has backend source (in `src/backend/` or `src/plugins/`), when the table renders, then the Backend column shows a green checkmark.
- Given a package has frontend source (in `src/frontend/` or `src/components/`), when the table renders, then the Frontend column shows a green checkmark.

#### F-06: Activity Feed

**Description**: A unified, chronological feed of audit trail entries and git commits.

**User Story**: As the CEO, I want to see a combined timeline of all company activity -- agent task completions, orchestrator decisions, and code commits -- so that I can track development velocity and identify issues.

**Acceptance Criteria**:
- Given the Activity page loads, when the API responds, then audit trail entries and git commits are merged into a single chronological feed sorted by timestamp (most recent first).
- Given an item is a git commit, when the item is rendered, then it shows a purple commit icon, commit message, short hash badge, author name, and timestamp.
- Given an item is an audit entry, when the item is rendered, then it shows a blue document icon, summary text, product name, agent name, and timestamp.
- Given the `?limit=50` query parameter is used, when the API responds, then at most 50 items are returned (capped at 100).
- Given no activity exists, when the page loads, then "No activity found" is displayed.

#### F-07: Infrastructure Dashboard

**Description**: Displays port assignments parsed from `PORT-REGISTRY.md` and CI/CD pipelines from `.github/workflows/`.

**User Story**: As an Engineer, I want to see which ports are assigned to which products and what CI pipelines exist so that I avoid port conflicts and understand the deployment setup.

**Acceptance Criteria**:
- Given the Infrastructure page loads, when the API responds, then 4 stat cards are shown: Frontend Ports (used, with available count), Backend Ports (used, with available count), CI Pipelines count, Port Range (3100-5099).
- Given port assignments exist, when the page renders, then a grid of product cards shows each product name with color-coded port badges (blue for frontend, green for backend).
- Given CI workflows exist in `.github/workflows/`, when the page renders, then each pipeline is listed with its filename and associated product name.
- Given no port assignments are found, when the page renders, then "No port assignments found in registry" is displayed.

#### F-08: Command Invocation (Invoke)

**Description**: Execute whitelisted commands from the dashboard with live output streaming via Server-Sent Events (SSE).

**User Story**: As the CEO, I want to run safe diagnostic commands (git status, docker compose ps) from the dashboard and see their output in real time so that I can quickly check system state without opening a terminal.

**Acceptance Criteria**:
- Given the Invoke page loads, when the page renders, then 6 quick-command preset buttons are shown in two categories: Git (Status, Recent Commits, Branch List, Diff Summary) and Infra (Docker Status, Docker Logs).
- Given the user clicks a preset button, when the click is processed, then the command text is populated into the input field.
- Given the user enters an allowed command and clicks Run, when the API receives the POST request, then a job is created, started, and the job ID is returned.
- Given a job is running, when the output stream starts, then lines are displayed in a terminal-style black box with monospace font, auto-scrolling to the latest line.
- Given a job is running, when the user clicks Cancel, then the process receives SIGTERM (and SIGKILL after 5 seconds if still alive) and the status changes to "cancelled."
- Given the user enters a command that does not start with an allowed prefix, when the POST request is made, then a 403 error is returned with the list of allowed prefixes.
- Given 3 jobs are already running, when the user tries to start a new job, then a 429 error is returned: "Max concurrent jobs (3) reached."
- Given jobs have been executed, when the page loads, then a Job History section shows previous jobs with command, timestamp, output line count, exit code, and status badge.
- Given a command is not in the input field, when the Run button is checked, then it is disabled.

**Allowed Command Prefixes**:
- `claude` (Claude Code CLI)
- `npm run` (npm scripts)
- `npm test` (tests)
- `npx ` (npx tools)
- `git status` (read-only)
- `git log` (read-only)
- `git diff` (read-only)
- `git branch` (read-only)
- `docker compose` (Docker operations)
- `docker-compose` (Docker operations, legacy)

---

### 4.2 Phase 2 Features (Planned)

#### F-09: Agent Invocation from Agent Hub

**Description**: Directly invoke an agent from its card in the Agent Hub, pre-filling the Invoke page with the appropriate `claude` command and agent context.

**User Story**: As the CEO, I want to click an "Invoke" button on an agent card and be taken to the Invoke page with a pre-configured command so that I can quickly dispatch work to a specific agent.

#### F-10: Product Health Checks

**Description**: Real-time health status for running products by probing their API and web ports.

**User Story**: As the CEO, I want to see green/red indicators on each product showing whether its API and web services are currently running so that I can immediately identify downed services.

**Acceptance Criteria**:
- Given a product has an API port, when the health check runs, then the system sends an HTTP GET to `http://localhost:{apiPort}/api/v1/health` and reports up/down.
- Given a product has a web port, when the health check runs, then the system sends an HTTP GET to `http://localhost:{webPort}` and reports up/down.
- Given health checks are running, when the Overview page renders, then a "Services Up/Down" KPI is added to the stat cards.

#### F-11: Real-Time Activity Stream

**Description**: WebSocket-based live updates for the Activity Feed instead of polling/refresh.

**User Story**: As the CEO, I want the Activity Feed to update in real time as new commits land and agent tasks complete so that I see changes without manually refreshing the page.

#### F-12: Search Across Products and Documentation

**Description**: A global search bar that searches across product names, agent names, component names, and document content.

**User Story**: As an Engineer, I want to type a keyword into a search bar and find matching products, agents, components, or documentation sections so that I can navigate quickly across the portfolio.

**Acceptance Criteria**:
- Given the user types 3+ characters into the search bar, when the debounced query fires, then results are grouped by category (Products, Agents, Components, Docs) with clickable links.
- Given a search result is a document, when the user clicks it, then the browser navigates to the Product Detail page with that document pre-selected.

#### F-13: Dependency Graph Visualization

**Description**: An interactive dependency graph showing how products depend on shared packages and on each other.

**User Story**: As the Architect, I want to see a visual graph of product-to-package dependencies so that I can assess coupling and plan refactoring.

#### F-14: Git Branch and PR Dashboard

**Description**: Display active branches, open PRs, and CI status per product using GitHub API.

**User Story**: As the CEO, I want to see what branches are active, what PRs are open, and whether CI is passing so that I can track work in progress and merge readiness.

#### F-15: Notification Center

**Description**: A notification bell that surfaces important events: CI failures, agent errors, stalled tasks, threshold breaches.

**User Story**: As the CEO, I want to be alerted when something goes wrong (CI failure, agent task failure, port conflict) without having to actively monitor every page.

#### F-16: Dashboard Customization

**Description**: Allow users to configure which stat cards, feeds, and widgets appear on their Overview page.

**User Story**: As the CEO, I want to customize my Overview dashboard layout so that I see the metrics most relevant to my current priorities.

---

### 4.3 Future Features

#### F-17: Cost Tracking and Token Usage

Track Claude API token consumption per agent, per product, and aggregate. Display cost projections.

#### F-18: Deployment Pipeline Trigger

Trigger deployments to staging/production from the dashboard with approval gates and rollback buttons.

#### F-19: Spec-Kit Integration

Surface spec-kit workflow status (specify, clarify, plan, tasks, analyze) per product, showing spec completion percentage and quality gate results.

#### F-20: Multi-Tenant Access Control

Add authentication and role-based access so that different team members see different dashboard views (CEO sees everything, individual agents see only their assigned products).

#### F-21: Historical Metrics and Trend Charts

Track KPIs over time (products launched, tests passing, commits per week, agent task completion rates) and display trend line charts.

---

## 5. User Flows

### 5.1 CEO Daily Check-In

```
1. CEO opens http://localhost:3113
2. Redirect to /overview
3. CEO scans 4 KPI stat cards for portfolio size
4. CEO reviews Phase Breakdown badges
5. CEO scans Recent Activity feed for agent completions
6. CEO scans Recent Commits feed for development velocity
7. If a product needs attention -> clicks product name in activity feed
   -> navigates to /products -> clicks product card -> /products/:name
8. Reviews product docs inline with theme toggle
```

### 5.2 Orchestrator Work Assignment

```
1. Orchestrator queries GET /api/v1/overview for company stats
2. Orchestrator queries GET /api/v1/agents for available agents
3. Orchestrator queries GET /api/v1/infrastructure for port availability
4. Orchestrator queries GET /api/v1/products/:name for target product details
5. Orchestrator assigns task to selected agent
```

### 5.3 Engineer Documentation Review

```
1. Engineer navigates to /products
2. Finds product of interest in the card grid
3. Clicks product card -> /products/:name
4. Sees product metadata (phase, ports, doc count)
5. Clicks a document in the left sidebar
6. Reads document with rendered Mermaid diagrams
7. Toggles to light theme for readability
8. Enters fullscreen for focused reading
9. Presses Escape to exit fullscreen
```

### 5.4 Engineer Running Diagnostics

```
1. Engineer navigates to /invoke
2. Clicks "Status Update" preset -> input populated with "git status"
3. Clicks "Run"
4. Watches live terminal output scroll in
5. Status badge shows "running" -> "completed" (green)
6. Scrolls down to see Job History with exit code 0
```

### 5.5 Engineer Component Discovery

```
1. Engineer navigates to /components
2. Reviews summary cards (X packages, Y files)
3. Scans table for package with needed capability
4. Checks Backend/Frontend/Prisma columns
5. Notes package name (@connectsw/xyz) for import
```

---

## 6. Requirements

### 6.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | The system shall display an Executive Overview with KPI stat cards for products, packages, agents, and total files. | P0 | Implemented |
| FR-02 | The system shall display a phase breakdown showing the count of products in each lifecycle phase (Production, MVP, Foundation, Planned). | P0 | Implemented |
| FR-03 | The system shall display the 5 most recent audit trail entries and git commits on the Overview page. | P0 | Implemented |
| FR-04 | The system shall list all products with name, description, phase badge, capability tags, port numbers, doc count, and file count. | P0 | Implemented |
| FR-05 | The system shall provide a Product Detail page with categorized document sidebar, inline Markdown rendering, light/dark theme toggle, and fullscreen mode. | P0 | Implemented |
| FR-06 | The system shall render Mermaid diagrams in product documentation using client-side SVG generation. | P0 | Implemented |
| FR-07 | The system shall list all AI agents with name, description, responsibilities, training status, and performance metrics. | P0 | Implemented |
| FR-08 | The system shall list all shared packages with backend/frontend/Prisma indicators and file counts. | P0 | Implemented |
| FR-09 | The system shall provide a unified Activity Feed merging audit entries and git commits, sorted chronologically. | P0 | Implemented |
| FR-10 | The system shall display port assignments parsed from PORT-REGISTRY.md and CI pipelines from .github/workflows/. | P0 | Implemented |
| FR-11 | The system shall allow execution of whitelisted commands via the Invoke page with live SSE output streaming. | P0 | Implemented |
| FR-12 | The system shall enforce a command whitelist, rejecting commands that do not start with an allowed prefix with a 403 response. | P0 | Implemented |
| FR-13 | The system shall limit concurrent invocation jobs to 3 and return a 429 error when the limit is exceeded. | P0 | Implemented |
| FR-14 | The system shall provide a health check endpoint at GET /api/v1/health returning service status and timestamp. | P0 | Implemented |
| FR-15 | The system shall detect product lifecycle phase based on the presence of tests, e2e, docker-compose, and PRD docs. | P1 | Implemented |
| FR-16 | The system shall cache product listing data for 30 seconds to avoid excessive filesystem scanning. | P1 | Implemented |
| FR-17 | The system shall prevent path traversal attacks when serving product documentation by rejecting `..` and `/` prefixes and verifying resolved paths stay within the product directory. | P0 | Implemented |
| FR-18 | The system shall support cancellation of running invoke jobs with SIGTERM followed by SIGKILL after a 5-second grace period. | P1 | Implemented |

### 6.2 Non-Functional Requirements

| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-01 | **Performance**: API endpoints shall respond within 500ms under normal load. | < 500ms p95 | Internal tool used by a small number of concurrent users. 500ms is acceptable for filesystem-based data aggregation. |
| NFR-02 | **Performance**: The Overview page shall render above the fold content within 2 seconds on a modern browser. | < 2s TTI | Fast iteration; CEO should not wait for daily check-ins. |
| NFR-03 | **Reliability**: The API shall remain operational without a database; all data is derived from the filesystem and git. | Zero external dependencies | Eliminates database availability as a failure mode. |
| NFR-04 | **Security**: Command execution is restricted to a fixed whitelist of prefixes. No arbitrary shell execution allowed. | 10 allowed prefixes | Prevents accidental or malicious command execution on the host. |
| NFR-05 | **Security**: Document serving shall validate file paths against path traversal attacks. | Zero traversal bypasses | Prevents reading files outside the product docs directory. |
| NFR-06 | **Security**: Invoke job output is capped at 5,000 lines per job. | <= 5,000 lines | Prevents memory exhaustion from runaway processes. |
| NFR-07 | **Scalability**: The system shall handle up to 20 products and 20 agents without degradation. | 20+ products | Current portfolio is 10+ products; allows 100% growth headroom. |
| NFR-08 | **Availability**: The system is an internal development tool. 99% uptime during business hours is acceptable. | 99% (business hours) | Not customer-facing; restarting during off-hours is acceptable. |
| NFR-09 | **Maintainability**: Frontend source files shall not exceed 300 lines each. | <= 300 lines (target) | ProductDetail.tsx is 466 lines; this is a known deviation to be addressed in a future refactor. |
| NFR-10 | **Portability**: The application shall run on macOS and Linux with Node.js 20+. | Node.js 20+ | Standard ConnectSW development environment. |
| NFR-11 | **Data Freshness**: Product data shall be no more than 30 seconds stale (cache TTL). | 30s TTL | Balances responsiveness with filesystem scan cost. |

---

## 7. Technical Architecture

### 7.1 Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend Runtime | Node.js | 20+ |
| Backend Framework | Fastify | 4.x |
| Frontend Framework | React | 18.x |
| Frontend Build Tool | Vite | 5.x |
| Frontend Router | React Router DOM | 6.x |
| Styling | Tailwind CSS | 3.x |
| Markdown Rendering | react-markdown + remark-gfm + rehype-raw | 10.x / 4.x / 7.x |
| Diagram Rendering | Mermaid | 11.x |
| Language | TypeScript | 5.x |

### 7.2 Ports

| Service | Port |
|---------|------|
| Web (Vite dev server) | 3113 |
| API (Fastify) | 5009 |

### 7.3 Data Sources

The API reads all data from the filesystem. No database is used.

| Data Source | Location | Used By |
|-------------|----------|---------|
| Product directories | `products/*/` | Products, Overview |
| Agent definitions | `.claude/agents/*.md` | Agents |
| Agent experience data | `.claude/memory/agent-experiences/*.json` | Agents |
| Audit trail | `.claude/audit-trail.jsonl` | Activity, Overview |
| Port registry | `.claude/PORT-REGISTRY.md` | Infrastructure |
| CI workflows | `.github/workflows/*.yml` | Infrastructure |
| Shared packages | `packages/*/` | Components |
| Git history | git CLI (`git log`) | Activity, Overview |

### 7.4 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check (status, service name, timestamp) |
| GET | `/api/v1/overview` | Company KPIs, phase breakdown, recent activity & commits |
| GET | `/api/v1/products` | List all products with metadata |
| GET | `/api/v1/products/:name` | Get a single product's metadata |
| GET | `/api/v1/products/:name/docs` | List all docs for a product with category/size/date |
| GET | `/api/v1/products/:name/docs/*` | Get raw Markdown content of a specific document |
| GET | `/api/v1/agents` | List all agents with capabilities and experience |
| GET | `/api/v1/agents/:id` | Get a single agent's details |
| GET | `/api/v1/activity` | Unified activity feed (?limit=N, max 100) |
| GET | `/api/v1/activity/audit` | Audit trail entries only (?limit=N, max 200) |
| GET | `/api/v1/activity/commits` | Git commits only (?limit=N, max 50) |
| GET | `/api/v1/components` | Component registry stats and package list |
| GET | `/api/v1/components/packages` | Package list only |
| GET | `/api/v1/infrastructure` | Port assignments and CI pipeline listing |
| POST | `/api/v1/invoke` | Create and start a new command job |
| GET | `/api/v1/invoke` | List job history (?limit=N, max 50) |
| GET | `/api/v1/invoke/:id` | Get a specific job's details |
| GET | `/api/v1/invoke/:id/stream` | SSE stream of job output lines |
| POST | `/api/v1/invoke/:id/cancel` | Cancel a running job |

### 7.5 Frontend Architecture

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `App.tsx` | `apps/web/src/` | Route definitions and top-level layout composition |
| `Layout.tsx` | `apps/web/src/components/` | Fixed sidebar navigation with 7 nav items, version footer, main content outlet |
| `Badge.tsx` | `apps/web/src/components/` | Reusable badge with 5 variants (default, success, warning, info, danger) |
| `StatCard.tsx` | `apps/web/src/components/` | Reusable KPI card with 5 color options and optional sublabel |
| `MarkdownRenderer.tsx` | `apps/web/src/components/` | Full-featured Markdown renderer with Mermaid, GFM tables, code blocks, theme support |
| `useApi.ts` | `apps/web/src/hooks/` | Generic data fetching hook with loading/error states and refetch capability |

---

## 8. Out of Scope

The following are explicitly NOT included in Command Center v0.1:

| Item | Reason |
|------|--------|
| **Authentication / Login** | Internal tool on localhost; no external access. |
| **User accounts and sessions** | Single-user tool; no multi-user scenarios in v0.1. |
| **Database** | All data is derived from the filesystem; no persistence layer needed. |
| **Write operations on products** | Command Center is read-only (except Invoke). Product modifications happen through agents and CLI. |
| **Deployment triggers** | Deployments are handled by DevOps workflows, not the dashboard. Planned for Future (F-18). |
| **Token/cost tracking** | Requires Claude API instrumentation not yet implemented. Planned for Future (F-17). |
| **Mobile responsive design** | Internal desktop tool; mobile optimization is not a priority. |
| **Automated testing** | No unit or integration tests are included in v0.1. Testing is a debt to address in Phase 2. |
| **Error monitoring / Sentry integration** | Internal tool; console logging is sufficient for v0.1. |
| **Spec-kit workflow visualization** | Requires deeper integration with `.specify/` directory. Planned for Future (F-19). |

---

## 9. Risks

### 9.1 Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Filesystem scanning is slow with 50+ products** | Medium | Low | Product listing uses a 30-second cache. If needed, add incremental scanning (only rescan changed directories using fs.watch). |
| **Invoke command whitelist bypass** | High | Low | Prefix-based whitelist is strict. However, command chaining (`;`, `&&`, `\|`) within an allowed prefix (e.g., `git status; rm -rf /`) is NOT blocked. Mitigation: add shell metacharacter sanitization in Phase 2. |
| **Mermaid rendering failures on complex diagrams** | Low | Medium | Graceful error handling shows raw source code on failure. Consider server-side rendering with `@mermaid-js/mermaid-cli` for reliability. |
| **Memory pressure from in-memory job store** | Medium | Low | Jobs are never garbage collected. After hundreds of invoke runs, memory grows. Mitigation: add a job store size limit (e.g., keep last 100 jobs). |
| **SSE connection leaks** | Medium | Low | Client disconnect handler clears the polling interval. However, zombie intervals could survive if the `close` event fails to fire. Mitigation: add a max job duration timeout (e.g., 10 minutes). |
| **ProductDetail.tsx exceeds 300-line guideline** | Low | Certain | Currently 466 lines. Should be decomposed into sub-components (DocSidebar, DocViewer, FullscreenViewer) in a refactor sprint. |

### 9.2 Business Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Low adoption if data is stale or inaccurate** | Medium | Medium | Phase detection heuristics may misclassify products. Add manual phase override via `product.json` config file. |
| **Security exposure if deployed beyond localhost** | High | Low | No authentication exists. If Command Center is ever exposed to a network, add authentication immediately. |
| **Invoke feature misuse** | Medium | Low | Invoke allows `npm run` which could trigger destructive scripts. The whitelist is necessary but not sufficient. Consider adding a confirmation dialog for non-read-only commands. |

### 9.3 User Adoption Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **CEO finds Overview insufficient** | Medium | Medium | Gather feedback after 1 week of use. The modular stat card system makes it easy to add new KPIs. |
| **Agents page lacks actionable value** | Low | Medium | Without direct agent invocation (F-09), the Agent Hub is informational only. Prioritize F-09 in Phase 2. |
| **Documentation viewer limitations** | Low | Medium | No search within documents, no table of contents generation. Both are straightforward enhancements for Phase 2. |

---

## 10. Appendix

### 10.1 Frontend Component Tree

```
<BrowserRouter>
  <App>
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/overview" />} />
        <Route path="overview" element={<Overview />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:name" element={<ProductDetail />} />
        <Route path="agents" element={<Agents />} />
        <Route path="activity" element={<Activity />} />
        <Route path="components" element={<Components />} />
        <Route path="infrastructure" element={<Infrastructure />} />
        <Route path="invoke" element={<Invoke />} />
      </Route>
    </Routes>
  </App>
</BrowserRouter>
```

### 10.2 Backend Service Layer

```
routes/v1/overview.ts      -> products.service, activity.service, components.service, agents.service
routes/v1/products.ts       -> products.service
routes/v1/agents.ts         -> agents.service
routes/v1/activity.ts       -> activity.service
routes/v1/components.ts     -> components.service
routes/v1/infrastructure.ts -> infrastructure.service
routes/v1/invoke.ts         -> invoke.service
                               repo.service (shared path resolution)
```

### 10.3 Phase Detection Logic

A product's phase is determined by the following heuristic:

| Phase | Criteria |
|-------|----------|
| Production | Has `apps/api/tests/` AND `e2e/` AND `docker-compose.yml` AND `docs/PRD.md` |
| MVP | Has `apps/api/tests/` AND `docker-compose.yml` |
| Foundation | Has `apps/api/src/` OR `apps/web/src/` |
| Planned | None of the above |

### 10.4 Document Category Classification

| Category | Matching Rule |
|----------|--------------|
| ADR | Path contains `adrs/` or `adr/` |
| PRD | Filename is `prd.md` (case-insensitive) |
| API | Filename is `api.md` (case-insensitive) |
| Architecture | Filename is `architecture.md` (case-insensitive) |
| Audit | Filename contains `audit` |
| Other | Default fallback |
