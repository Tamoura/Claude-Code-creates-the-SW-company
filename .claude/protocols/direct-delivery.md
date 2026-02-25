# Direct Delivery Protocol (Telephone Game Fix)

**Version**: 1.0.0
**Created**: 2026-02-25
**Source**: Adapted from Agent-Skills-for-Context-Engineering (multi-agent-patterns skill)

## Problem: The Telephone Game

When the orchestrator synthesizes specialist agent responses before presenting to the CEO, information degrades. Research shows supervisor paraphrasing causes **~50% performance degradation** in information transfer. Each hop through the orchestrator's context loses detail, nuance, and technical precision.

```
BEFORE (Lossy):
  Specialist Agent → [writes report] → Orchestrator reads → Orchestrator summarizes → CEO
  (50% information loss at each synthesis step)

AFTER (Direct Delivery):
  Specialist Agent → [writes deliverable to file] → Orchestrator provides summary + file path → CEO
  (Orchestrator summarizes; CEO reads full deliverable directly when needed)
```

---

## Protocol

### 1. Specialist Agents Write Deliverables to Files

When a specialist agent completes a task, it writes its deliverable to a standard location:

```
products/{PRODUCT}/.claude/deliverables/{TASK_ID}-{AGENT}-{ARTIFACT_TYPE}.md
```

**Artifact types**: `report`, `analysis`, `design`, `implementation-summary`, `test-report`, `audit-report`

**Examples**:
```
products/stablecoin-gateway/.claude/deliverables/BA-01-business-analyst-report.md
products/stablecoin-gateway/.claude/deliverables/SPEC-01-product-manager-report.md
products/stablecoin-gateway/.claude/deliverables/ARCH-01-architect-design.md
products/stablecoin-gateway/.claude/deliverables/QA-01-qa-engineer-test-report.md
```

### 2. Orchestrator Summarizes (Does Not Re-Synthesize)

The orchestrator reads the deliverable file and produces a **3-5 line summary** for its own context tracking. It does NOT re-write or paraphrase the full deliverable.

**Orchestrator's internal record**:
```yaml
task_id: ARCH-01
agent: architect
status: completed
summary: "System design complete. 3-service architecture (API, Auth, Worker) with PostgreSQL. 12 endpoints defined. Full design at deliverables/ARCH-01-architect-design.md"
deliverable_path: "products/stablecoin-gateway/.claude/deliverables/ARCH-01-architect-design.md"
```

### 3. CEO Reports Reference File Paths

At checkpoints, the orchestrator provides the CEO with:
- A concise status summary (orchestrator's own words)
- Direct file paths to all deliverables for detailed review
- Quality gate results

**CEO checkpoint format**:
```markdown
## Checkpoint: Architecture Complete

### Summary
Architecture design is complete for stablecoin-gateway. The architect designed a
3-service architecture (API Gateway, Auth Service, Worker) with PostgreSQL and Redis.
12 API endpoints defined across 4 resource groups. All quality gates passed.

### Deliverables (read for full detail)
| Deliverable | Agent | Path |
|------------|-------|------|
| Architecture Design | Architect | `products/stablecoin-gateway/.claude/deliverables/ARCH-01-architect-design.md` |
| API Contract | Architect | `products/stablecoin-gateway/docs/API.md` |
| ADR-001: Service Split | Architect | `products/stablecoin-gateway/docs/ADRs/001-service-architecture.md` |

### Quality Gates
- Spec Consistency: PASS
- Documentation Gate: PASS (4 Mermaid diagrams, 3 diagram types)
```

### 4. Inter-Agent Handoffs Use Files

When one agent's output feeds into another agent's input (e.g., Architect → Backend Engineer), the downstream agent reads the file directly rather than receiving a paraphrased version through the orchestrator.

**Orchestrator prompt to downstream agent**:
```
## Input from Prior Task
Read the architecture design at: products/{PRODUCT}/.claude/deliverables/ARCH-01-architect-design.md
This contains the API contracts, data models, and system design you must implement.
```

This ensures the backend engineer reads the architect's exact output — not the orchestrator's interpretation of it.

---

## Directory Structure

```
products/{PRODUCT}/.claude/
├── deliverables/           # Agent deliverables for CEO and downstream agents
│   ├── BA-01-business-analyst-report.md
│   ├── SPEC-01-product-manager-report.md
│   ├── ARCH-01-architect-design.md
│   └── ...
├── scratch/                # Temporary agent outputs (large tool results)
│   ├── session-summary-BACKEND-01.md
│   └── ...
└── handoffs/               # Structured inter-agent communication
    ├── ARCH-01-to-BACKEND-01.md
    └── ...
```

---

## When to Use Direct Delivery vs. Orchestrator Synthesis

| Situation | Approach |
|-----------|----------|
| CEO checkpoint deliverables | Direct delivery (always) |
| Inter-agent handoffs | Direct delivery via file read |
| Status updates (in-progress) | Orchestrator summary (brief, no full synthesis) |
| Error/failure reports | Orchestrator summary + error details in file |
| Trivial task completion | Orchestrator summary only (no file needed) |

---

## Benefits

1. **Zero information loss**: CEO and downstream agents read exact specialist output
2. **Reduced orchestrator context**: Orchestrator holds 3-5 line summaries, not full deliverables
3. **Audit trail**: All deliverables are persisted as files, providing complete project history
4. **Parallel-safe**: Multiple agents writing to different files avoids context conflicts
5. **Re-readable**: If context is compressed or session restarts, deliverables are still on disk
