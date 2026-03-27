# gstack vs ConnectSW — Comparative Analysis

**Date**: 2026-03-27
**Purpose**: Compare Garry Tan's gstack with ConnectSW's agent system to identify strengths, gaps, and adoption opportunities.

---

## Executive Summary

**gstack** and **ConnectSW** both turn Claude Code into a virtual engineering team, but they solve fundamentally different problems:

| Dimension | gstack | ConnectSW |
|-----------|--------|-----------|
| **Target user** | Solo founder / indie developer | AI-first software company (CEO + agent team) |
| **Philosophy** | Sprint workflow for one person | Specification-first enterprise governance |
| **Scope** | Single product at a time | 15-product monorepo portfolio |
| **Killer feature** | Real browser automation (Playwright daemon) | Mechanical quality gates + spec traceability |
| **Complexity** | Low (clone & go) | High (constitution, registries, protocols) |

**Bottom line**: gstack optimizes for **speed** (ship fast, iterate); ConnectSW optimizes for **correctness** (spec first, gate everything). They are complementary, not competing.

---

## 1. Architecture & Design Philosophy

### gstack
- **28 skills** installed as Claude Code skills in `~/.claude/skills/gstack/`
- **Sprint-based workflow**: Think → Plan → Build → Review → Test → Ship → Reflect
- **Persona-driven**: Each skill pairs a specialist persona with a forcing function
- **Stateless between sessions** (workflow artifacts persist to `~/.gstack/projects/`)
- **No governance layer** — developer decides what to skip

### ConnectSW
- **18 specialist agents** with an Orchestrator routing all work
- **Spec-kit pipeline**: CEO Brief → BA → Specify → Clarify → PRD → Architecture → Plan → Tasks → Implement → Analyze
- **Constitution-governed**: 14 articles with mechanical enforcement (CI blocks, pre-commit hooks)
- **Stateful**: Memory system (company knowledge, agent experiences, audit trail)
- **Mandatory gates** — agents cannot skip quality processes

### Verdict
gstack is a **toolkit** (pick what you need). ConnectSW is a **system** (everything is connected and enforced). gstack trusts the developer; ConnectSW trusts the process.

---

## 2. Agent / Skill Roster

| Role | gstack Skill | ConnectSW Agent |
|------|-------------|-----------------|
| CEO / Founder thinking | `/office-hours`, `/plan-ceo-review` | CEO (human) + Orchestrator |
| Product planning | `/plan-ceo-review` | Product Manager + Business Analyst |
| Architecture | `/plan-eng-review` | Architect |
| UI/UX Design | `/plan-design-review`, `/design-consultation`, `/design-review` | UI/UX Designer |
| Code review | `/review` | Code Reviewer |
| QA / Testing | `/qa`, `/qa-only` | QA Engineer |
| Security | `/cso` | Security Engineer |
| Release / Ship | `/ship` | DevOps Engineer + Orchestrator |
| Documentation | `/document-release` | Technical Writer |
| Debugging | `/investigate` | Support Engineer |
| Retrospective | `/retro` | (no equivalent) |
| Browser automation | `/browse`, `/setup-browser-cookies` | (no equivalent) |
| Safety guards | `/careful`, `/freeze`, `/guard` | Git Safety (Article VIII) + CI |
| Second opinion | `/codex` (OpenAI) | (no equivalent) |
| Backend dev | — | Backend Engineer |
| Frontend dev | — | Frontend Engineer |
| AI/ML | — | AI/ML Engineer |
| Mobile | — | Mobile Developer |
| Data | — | Data Engineer |
| Performance | — | Performance Engineer |
| Strategy | — | Product Strategist |
| Innovation | — | Innovation Specialist |

### Key Gaps

**gstack has, ConnectSW lacks:**
- Real browser automation (`/browse` with persistent Chromium daemon)
- Cookie import from real browsers (`/setup-browser-cookies`)
- Retrospective analysis from git history (`/retro`)
- Multi-model second opinion (`/codex` calls OpenAI)
- Destructive command protection (`/careful`, `/freeze`, `/guard`)
- Design system generation + 80-item visual audit

**ConnectSW has, gstack lacks:**
- Dedicated Backend/Frontend/Mobile/Data/AI engineers
- Component reuse ecosystem (11 shared packages, 60+ components)
- Specification pipeline (spec-kit: specify → clarify → plan → tasks → analyze)
- Anti-rationalization framework (12 TDD + 5 process counters)
- Multi-product portfolio management (port registry, product registry)
- Memory system (agent learning, company knowledge, audit trail)
- Context engineering (progressive disclosure, attention-optimized prompts)
- Traceability (every artifact → requirement ID)

---

## 3. Tech Stack

| Layer | gstack | ConnectSW |
|-------|--------|-----------|
| **Runtime** | Bun v1.0+ (Node.js fallback) | Node.js 20+ |
| **Language** | TypeScript | TypeScript 5+ (strict mode) |
| **Backend** | (not opinionated) | Fastify + Prisma + PostgreSQL |
| **Frontend** | (not opinionated) | Next.js 14+ + React 18+ + Tailwind |
| **Database** | (not opinionated) | PostgreSQL 15+ + Redis |
| **Testing** | Playwright (browser) | Jest + Playwright (E2E) |
| **Validation** | — | Zod |
| **Build** | Bun compile (native binaries) | esbuild + pnpm |
| **Browser automation** | Persistent Chromium daemon | — |
| **CI/CD** | — | GitHub Actions (per-product workflows) |
| **Linting** | — | Shared ESLint config (@connectsw/eslint-config) |
| **Security scanning** | OWASP + STRIDE (via `/cso`) | Semgrep + pnpm audit (CI-blocking) |

### Verdict
gstack is **stack-agnostic** (works with any project). ConnectSW is **stack-opinionated** (Fastify + Next.js enforced by constitution, ADR required for deviation).

---

## 4. Quality & Safety

| Mechanism | gstack | ConnectSW |
|-----------|--------|-----------|
| **Code review** | `/review` (paranoid staff engineer persona) | Code Reviewer agent + CI gate |
| **Security audit** | `/cso` (OWASP Top 10 + STRIDE) | Security Engineer + Semgrep CI |
| **Test generation** | `/qa` auto-generates regression tests | TDD mandatory (Article III) |
| **Browser testing** | `/browse` with real Chromium | Browser-First Gate (manual) |
| **Destructive cmd protection** | `/careful` + `/freeze` + `/guard` | Git Safety (Article VIII) + hooks |
| **Skip prevention** | Honor system (dev chooses) | Anti-rationalization counters (Article XI) |
| **Coverage gate** | No minimum enforced | 80%+ mandatory (CI blocks) |
| **Spec validation** | No formal spec system | `/speckit.analyze` validates alignment |
| **Quality gates** | Informal (gating by convention) | 6 mandatory gates (spec, browser, security, testing, code review, production) |

### Verdict
gstack provides **tools for quality** but trusts the developer to use them. ConnectSW **mechanically enforces quality** — agents literally cannot proceed without passing gates.

---

## 5. Workflow Comparison

### gstack Sprint Flow
```
/office-hours          → Reframe the problem (YC-style)
/plan-ceo-review       → Founder thinking, scope decisions
/plan-eng-review       → Architecture lock-down
/plan-design-review    → Design quality scoring
  implement            → (developer writes code)
/review                → Staff engineer audit
/browse or /qa         → Real browser QA
/cso                   → Security audit
/ship                  → Release (sync, test, PR)
/document-release      → Update docs
/retro                 → Retrospective
```
**~11 steps, flexible order, developer-driven**

### ConnectSW Spec-Kit Pipeline
```
CEO Brief              → Natural language request
BA Analysis            → Stakeholder map, feasibility
/speckit.specify       → Formal spec (FR/NFR/US/AC with IDs)
/speckit.clarify       → Resolve ambiguities
  CEO CHECKPOINT       → Approve PRD
/speckit.plan          → Architecture + data model + API contracts
/speckit.tasks         → Dependency-ordered task graph
/speckit.analyze       → Consistency validation
  CEO CHECKPOINT       → Approve architecture
  Implementation       → Parallel agents (Backend, Frontend, Data, etc.)
  Testing Gate         → 80%+ coverage, all tests pass
  Browser Gate         → Works in real browser
  Security Gate        → No high/critical vulnerabilities
  Code Review Gate     → OWASP audit
  CEO CHECKPOINT       → Approve delivery
  Production Gate      → Health, logging, monitoring, graceful shutdown
```
**~17 steps, mandatory order, system-enforced with 3 CEO checkpoints**

---

## 6. Browser Automation — gstack's Standout Feature

gstack's `/browse` is its most differentiated capability:

| Feature | gstack | ConnectSW |
|---------|--------|-----------|
| Persistent Chromium daemon | Yes (100-200ms per command) | No |
| Real cookie sessions | Yes (import from Chrome/Arc/Brave/Edge) | No |
| Screenshot capture | Yes (automatic) | No |
| Human handoff (CAPTCHAs) | Yes (`$B handoff`) | No |
| Isolated concurrent sessions | Yes (per-workspace browser) | No |
| Accessibility-based selectors | Yes (@refs via a11y tree) | No |
| Console/network/dialog capture | Yes (ring buffers, 50K entries) | No |

**This is a significant gap in ConnectSW.** Browser automation enables:
- Live QA of running applications
- Visual regression testing
- Real-world auth flow testing
- Design review with actual screenshots

---

## 7. Setup & Onboarding

| Aspect | gstack | ConnectSW |
|--------|--------|-----------|
| **Install** | `git clone && ./setup` | Clone repo + read constitution + understand 14 articles |
| **Time to first use** | ~2 minutes | ~30 minutes (context ramp-up) |
| **Learning curve** | Low (just use slash commands) | High (spec-kit pipeline, registries, protocols) |
| **Documentation** | Auto-generated from source | 17 protocol files + constitution + registries |
| **Upgrades** | `/gstack-upgrade` | Git pull + manual review |

---

## 8. Scalability

| Dimension | gstack | ConnectSW |
|-----------|--------|-----------|
| **Products** | 1 at a time | 15 simultaneous (monorepo) |
| **Parallel agents** | 10-15 via Conductor | 4+ via Orchestrator task graphs |
| **Component reuse** | None (each project standalone) | 11 shared packages, 60+ components |
| **Port management** | Random (10000-60000) | Registry (3100-3199 frontend, 5000-5099 backend) |
| **Cross-project coordination** | None | Orchestrator state + product registry |

---

## 9. What ConnectSW Could Adopt from gstack

### High Priority
1. **Browser automation** — Integrate a `/browse`-like capability for live QA, visual testing, and design reviews. This would strengthen the Browser-First Gate significantly.
2. **Retrospective analysis** (`/retro`) — Analyze commit history, identify patterns, test health trends. Feed into the memory system.
3. **Destructive command guards** (`/careful` + `/freeze`) — Add explicit CLI-level protection beyond git hooks. Especially useful during production debugging.

### Medium Priority
4. **Cookie-based auth testing** — Import real browser sessions for E2E testing of OAuth/SSO flows.
5. **Design system generation** (`/design-consultation`) — Automated typography, color, spacing, motion system generation.
6. **80-item visual audit** (`/design-review`) — Structured design quality checklist with live screenshots.

### Lower Priority
7. **Multi-model second opinion** (`/codex`) — Cross-validate with OpenAI for critical decisions.
8. **Auto-generated skill docs** — gstack's template-based doc generation prevents doc drift.

---

## 10. What gstack Could Adopt from ConnectSW

### High Priority
1. **Specification pipeline** — Formal spec-first development prevents the #1 source of rework.
2. **Component reuse ecosystem** — Shared packages across projects prevent re-building auth, logging, webhooks.
3. **Mechanical quality gates** — CI-enforced coverage, security scanning, traceability.

### Medium Priority
4. **Anti-rationalization framework** — Explicit counters for "too simple to test" and similar rationalizations.
5. **Context engineering** — Progressive disclosure prevents token degradation in long sessions.
6. **Memory system** — Agent learning from past work improves over time.

### Lower Priority
7. **Multi-product coordination** — Port registry, product registry, cross-product state.
8. **Traceability** — Requirement IDs linking every artifact back to specs.

---

## 11. Summary Matrix

| Category | gstack | ConnectSW | Winner |
|----------|--------|-----------|--------|
| **Setup speed** | 2 min | 30 min | gstack |
| **Learning curve** | Low | High | gstack |
| **Browser automation** | Excellent | None | gstack |
| **Design tooling** | Strong (4 skills) | Basic | gstack |
| **Sprint velocity** | Very fast | Moderate (gates slow you down) | gstack |
| **Spec rigor** | None | Excellent (spec-kit) | ConnectSW |
| **Quality enforcement** | Optional | Mandatory | ConnectSW |
| **Component reuse** | None | 60+ components | ConnectSW |
| **Multi-product** | No | 15 products | ConnectSW |
| **Traceability** | None | Full (req → code → test) | ConnectSW |
| **Agent memory** | None | Learning system | ConnectSW |
| **Security scanning** | Manual (`/cso`) | CI-enforced (Semgrep) | ConnectSW |
| **Context management** | None | Progressive disclosure | ConnectSW |
| **Anti-rationalization** | None | 17 explicit counters | ConnectSW |
| **Governance** | None (trust developer) | 14-article constitution | ConnectSW |

---

## 12. Adoption Status — gstack Features into ConnectSW

All of gstack's standout advantages have been adopted into ConnectSW as protocols:

| gstack Feature | ConnectSW Protocol | Status |
|----------------|-------------------|--------|
| `/browse` (persistent Chromium daemon) | `browser-automation.md` | **ADOPTED** |
| `/setup-browser-cookies` (cookie import) | `browser-automation.md` (Cookie Import section) | **ADOPTED** |
| `/design-consultation` (design system gen) | `design-review.md` (Part 1) | **ADOPTED** |
| `/plan-design-review` (design scoring) | `design-review.md` (Part 2) | **ADOPTED** |
| `/design-review` (80-item visual audit) | `design-review.md` (Part 3) | **ADOPTED** |
| `/retro` (retrospective analysis) | `retrospective.md` + `retrospective-tasks.yml` | **ADOPTED** |
| `/careful` (destructive cmd warning) | `destructive-command-guards.md` (Level 1) | **ADOPTED** |
| `/freeze` (directory boundary lock) | `destructive-command-guards.md` (Level 2) | **ADOPTED** |
| `/guard` (maximum protection) | `destructive-command-guards.md` (Level 3) | **ADOPTED** |
| `/codex` (multi-model second opinion) | `multi-model-review.md` | **ADOPTED** |
| Auto-generated SKILL.md from source | `living-documentation.md` | **ADOPTED** |

### Files Created
- `.claude/protocols/browser-automation.md` — Persistent Chromium daemon, cookie import, visual regression, human handoff
- `.claude/protocols/design-review.md` — Design system generation, 10-dimension scoring, 80-item visual audit
- `.claude/protocols/retrospective.md` — Post-milestone analysis, pattern extraction, memory updates
- `.claude/protocols/destructive-command-guards.md` — 3-level protection: careful → freeze → guard
- `.claude/protocols/multi-model-review.md` — Cross-validate with second AI model (3 modes)
- `.claude/protocols/living-documentation.md` — Auto-generated docs, CI validation, staleness detection
- `.claude/workflows/templates/retrospective-tasks.yml` — 6-task retrospective workflow
- `.claude/CLAUDE.md` — Protocol library table updated with all new protocols

---

## 13. Conclusion

**gstack** is the right tool for a **solo founder shipping fast** — it gives you a complete sprint workflow with real browser automation in 2 minutes. Its strength is speed and simplicity.

**ConnectSW** is the right system for **building a portfolio of production-grade products** — it enforces quality at every step and prevents the rework that comes from skipping specs and tests. Its strength is correctness and scale.

With the adoption of all gstack standout features, ConnectSW now combines both approaches: **gstack's velocity tools** (browser automation, design tooling, retrospectives, safety guards) operating within **ConnectSW's governed framework** (spec-kit, quality gates, traceability, constitution). The result is a system that can move fast AND maintain correctness at scale.

---

*Analysis by: Research Agent | Session: 2026-03-27*
