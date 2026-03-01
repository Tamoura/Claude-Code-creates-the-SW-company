# Playbook Enhancement Plan: Applying the 100x Playbook to ConnectSW

> **Date**: 2026-03-01
> **Purpose**: Gap analysis between the Claude Code 100x Playbook and our current agentic workflow, with concrete enhancement actions

---

## Current State Assessment

### What We Already Have (Strong Foundation)

ConnectSW's existing infrastructure already implements **~60% of the playbook** at a sophisticated level:

| Playbook Layer | Current Coverage | Assessment |
|---------------|-----------------|------------|
| Layer 1: CLAUDE.md | **90%** | Excellent — well-structured, protocol pitching in place |
| Layer 2: Plan→Execute | **85%** | spec-kit pipeline, TDD mandate, verification protocols |
| Layer 3: Parallel Agents | **75%** | Parallel execution protocol, background tasks, worktree docs |
| Layer 4: Subagents & Skills | **70%** | 16+ agents, skills system, but limited domain-specific skills |
| Layer 5: Agent SDK | **10%** | Future plan only — not yet built |
| Layer 6: MCP Integrations | **30%** | GitNexus only — missing browser, error monitoring, live docs |
| Layer 7: GitHub Actions | **50%** | CI per product + claude.yml, but not fully autonomous |

```mermaid
graph LR
    subgraph "Current Coverage"
        L1["Layer 1: 90%"]
        L2["Layer 2: 85%"]
        L3["Layer 3: 75%"]
        L4["Layer 4: 70%"]
        L5["Layer 5: 10%"]
        L6["Layer 6: 30%"]
        L7["Layer 7: 50%"]
    end

    style L1 fill:#2d5016,stroke:#4a8c1c,color:#fff
    style L2 fill:#2d5016,stroke:#4a8c1c,color:#fff
    style L3 fill:#3d6a1e,stroke:#4a8c1c,color:#fff
    style L4 fill:#3d6a1e,stroke:#4a8c1c,color:#fff
    style L5 fill:#5c1a1a,stroke:#c0392b,color:#fff
    style L6 fill:#5c3a1a,stroke:#e67e22,color:#fff
    style L7 fill:#5c4a1a,stroke:#f39c12,color:#fff
```

---

## Gap Analysis: Where the Playbook Adds Value

### Gap 1: Context Window Hygiene (Layer 1 → Layer 2)

**Current State**: We have context-engineering.md and context-compression.md protocols, but they're **documented, not enforced**.

**Gap**: No automated `/clear` triggers. No context usage monitoring. No automatic `/compact` when context exceeds thresholds. Agents don't actively manage their context — they just run until degradation hits.

**Enhancement**:

```mermaid
flowchart TD
    A[Agent Starts Task] --> B{Context at 60%?}
    B -->|No| C[Continue Working]
    B -->|Yes| D[Trigger Context Compression Protocol]
    D --> E[Compress old tool outputs]
    E --> F[Write intermediate state to scratch/]
    F --> C
    C --> G{Context at 85%?}
    G -->|No| H[Continue]
    G -->|Yes| I[Force Isolation: spawn sub-agent with clean context]
    I --> J[Sub-agent reads state from scratch/]
    J --> H
```

**Concrete Actions**:
1. Add a `context-hygiene` hook (`.claude/hooks/context-monitor.sh`) that logs context usage
2. Update orchestrator prompt to explicitly instruct agents: "If you've read >10 files, use /compact before continuing"
3. Add context-check step to the Verification-Before-Completion protocol

---

### Gap 2: Multi-Agent Review Pipeline (Layer 3)

**Current State**: Code Reviewer agent exists but operates as a single-pass review. No structured Writer → Reviewer → Editor pipeline with context isolation.

**Gap**: The playbook's "Claude A writes → Claude B reviews → Claude C fixes" pattern with `/clear` between each eliminates accumulated bias. Our current flow has the same agent session accumulate context from writing through review.

**Enhancement**:

```mermaid
sequenceDiagram
    participant O as Orchestrator
    participant W as Writer Agent (Backend/Frontend)
    participant R as Code Reviewer Agent
    participant F as Fixer Agent (same specialty as Writer)

    O->>W: Implement feature (clean context)
    W->>W: Write code + tests
    W-->>O: Done. Code at products/X/apps/api/

    O->>R: Review code at products/X/apps/api/ (clean context)
    Note over R: Fresh context — no writer bias
    R->>R: Full code review
    R-->>O: Review report at deliverables/

    alt Issues Found
        O->>F: Fix issues per review (clean context)
        Note over F: Reads code + review — no accumulated bias
        F->>F: Apply fixes
        F-->>O: Fixes applied
    end
```

**Concrete Actions**:
1. Add a `multi-pass-review` protocol to `.claude/protocols/multi-pass-review.md`
2. Update the orchestrator to support a `review_pipeline: true` flag on tasks
3. When enabled, orchestrator chains: implement → code-review → fix (each as separate agent invocations)

---

### Gap 3: MCP Integrations (Layer 6)

**Current State**: Only GitNexus MCP is active. Missing critical integrations for browser testing, error monitoring, and live documentation.

**Gap**: Agents can't see browser console errors, can't read Sentry logs, and may hallucinate API signatures for external libraries.

**Enhancement Priority Matrix**:

| MCP Integration | Impact | Effort | Priority |
|----------------|--------|--------|----------|
| **Playwright MCP** | High — visual testing, console log access | Medium | P0 |
| **GitHub App** (claude-code-review) | High — auto-review every PR | Low (already partially set up) | P0 |
| **Sentry MCP** | Medium — auto-bug-fixing | Medium | P1 |
| **Context7 / Live Docs** | Medium — prevent API hallucination | Low | P1 |

**Concrete Actions**:
1. Configure Playwright MCP in `.mcp.json` for browser-based testing during QA gate
2. Activate the GitHub App for automatic PR reviews (claude-code-review.yml already exists but needs secrets)
3. Add Context7 MCP for live documentation of Fastify, Prisma, Next.js APIs
4. Create `.mcp.json` configuration file in project root

---

### Gap 4: Autonomous GitHub Actions Pipeline (Layer 7)

**Current State**: CI/CD workflows run tests and linting. `claude.yml` responds to `@claude` mentions. But there's no **autonomous bug-to-PR pipeline**.

**Gap**: The playbook describes a full async loop: bug report → GHA → Claude agent → tested fix → PR. Our current setup is reactive (human triggers `@claude`), not autonomous.

**Enhancement**:

```mermaid
flowchart TD
    subgraph Triggers
        A1[GitHub Issue with 'bug' label]
        A2[Sentry Alert]
        A3[Failed CI Run]
    end

    subgraph "Autonomous Pipeline"
        B[Claude Code GHA Triggered]
        C[Agent Analyzes Context]
        D[Agent Implements Fix]
        E[Agent Runs Tests]
        F{Tests Pass?}
        G[Create PR]
        H[Retry Fix]
    end

    subgraph "Human Gate"
        I[CEO/Code Reviewer Reviews PR]
        J[Merge]
    end

    A1 --> B
    A2 --> B
    A3 --> B
    B --> C --> D --> E --> F
    F -->|Yes| G --> I --> J
    F -->|No| H --> E

    style G fill:#2d5016,stroke:#4a8c1c,color:#fff
    style J fill:#2d5016,stroke:#4a8c1c,color:#fff
```

**Concrete Actions**:
1. Create `.github/workflows/claude-auto-fix.yml` — triggers on issues labeled `bug` + `auto-fix`
2. Create `.github/workflows/claude-ci-fix.yml` — triggers when CI fails on a PR, attempts to fix
3. Configure with appropriate permissions (contents: write, pull-requests: write)
4. Add safety gate: auto-fix PRs require manual approval before merge

---

### Gap 5: Domain-Specific Skills (Layer 4)

**Current State**: Skills are mostly operational (`/orchestrator`, `/audit`, `/status`, spec-kit suite). Missing domain-specific reusable workflows.

**Gap**: The playbook emphasizes skills like `/deploy-check` that encode domain knowledge. ConnectSW has unique domains (Shariah compliance, Arabic NLP, Qatar regulatory) that should have dedicated skills.

**Concrete Actions**:
1. Create `.claude/commands/compliance-check.md` — Shariah/QFCRA compliance validation
2. Create `.claude/commands/i18n-check.md` — Arabic/English bilingual completeness check
3. Create `.claude/commands/pre-deploy.md` — Production readiness checklist
4. Create `.claude/commands/security-scan.md` — OWASP Top 10 quick scan

---

### Gap 6: Agent SDK Integration (Layer 5)

**Current State**: Not started. This is the longest-term gap.

**Gap**: The playbook describes building headless agents for CI/CD, programmatic chains, and customer-facing products. This is where GovernAI's agent runtime would live.

**This is a strategic initiative, not a tactical enhancement. Track in product roadmap.**

---

## Implementation Roadmap

```mermaid
gantt
    title Playbook Enhancement Roadmap
    dateFormat YYYY-MM-DD
    axisFormat %b %d

    section Quick Wins (Week 1)
    MCP config file (.mcp.json)             :qw1, 2026-03-01, 2d
    Domain-specific skills (4 commands)     :qw2, 2026-03-01, 3d
    Context hygiene additions to protocols  :qw3, 2026-03-03, 2d
    Activate GitHub App PR reviews          :qw4, 2026-03-03, 1d

    section Medium Term (Week 2-3)
    Multi-pass review protocol              :mt1, 2026-03-08, 3d
    Playwright MCP integration              :mt2, 2026-03-08, 3d
    Claude auto-fix GHA workflow            :mt3, 2026-03-11, 3d
    Claude CI-fix GHA workflow              :mt4, 2026-03-14, 2d

    section Long Term (Month 2+)
    Sentry MCP integration                  :lt1, 2026-03-22, 5d
    Agent SDK prototype                     :lt2, 2026-04-01, 14d
    Context7 live docs MCP                  :lt3, 2026-03-22, 3d
```

---

## Priority Summary

| # | Enhancement | Impact | Effort | Timeline |
|---|------------|--------|--------|----------|
| 1 | Domain-specific skills (compliance, i18n, deploy, security) | High | Low | Week 1 |
| 2 | MCP configuration (Playwright, Context7) | High | Medium | Week 1-2 |
| 3 | Multi-pass review protocol | High | Medium | Week 2 |
| 4 | Autonomous bug-fix GHA pipeline | High | Medium | Week 2-3 |
| 5 | Context hygiene enforcement | Medium | Low | Week 1 |
| 6 | Agent SDK (GovernAI runtime) | Transformative | High | Month 2+ |

---

## Key Insight

The playbook's meta-philosophy — **"Outputs are disposable; plans and prompts compound"** — maps perfectly to ConnectSW's existing spec-kit pipeline. Our specifications, plans, and task lists ARE the compounding assets. The enhancements above focus on **closing the automation loop**: making agents more autonomous (GHA pipelines), more aware (MCP integrations), and more reliable (multi-pass reviews, context hygiene).

The biggest single unlock is **Gap 4 (Autonomous GHA Pipeline)** — it turns ConnectSW from a system where the CEO manually triggers all work into one where work flows in continuously and the CEO's role shifts to **reviewing and approving**, not initiating.
