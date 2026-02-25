# Context Engineering Protocol

**Version**: 1.0.0
**Created**: 2026-02-25
**Source**: Adapted from [Agent-Skills-for-Context-Engineering](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering)

## Core Principle

Context windows degrade due to **attention mechanics**, not raw token limits. Models exhibit U-shaped attention curves where middle tokens receive 10-40% less attention weight. Effective context engineering identifies the minimal high-signal token set that maximizes desired outcomes.

---

## 1. Progressive Disclosure

Agents load only what they need, when they need it. Context is organized into three levels:

### Level 1: Identity + Task (Always Loaded)
- Agent role (1-2 sentences)
- Current task description + acceptance criteria
- Branch and product info

**Token budget**: ~500 tokens

### Level 2: Relevant Context (Loaded on Demand)
- Pre-scored patterns from memory (top 5, score >= 4/10)
- Anti-patterns (top 3, score >= 3/10)
- Relevant gotchas (top 3)
- Agent's past experience (common mistakes, preferred approaches)
- Context chain from upstream completed tasks (capped at 500 words)

**Token budget**: ~1,500 tokens

### Level 3: Deep Reference (Only When Needed)
- Full agent brief (50-80 lines)
- Component registry excerpt (matching entries only)
- Product addendum
- Coding conventions scan instructions

**Token budget**: ~3,000 tokens

### Loading Rules

| Task Complexity | Levels Loaded | Estimated Tokens |
|----------------|---------------|-----------------|
| Trivial (typo, config) | Level 1 only | ~500 |
| Simple (single bug fix) | Level 1 + Level 2 | ~2,000 |
| Standard (multi-file feature) | Level 1 + Level 2 + Level 3 | ~5,000 |
| Complex (new product, architecture) | All levels + full brief | ~8,000 |

### Implementation

The orchestrator determines task complexity (Step 2.5 in orchestrator-enhanced.md) and assembles the sub-agent prompt accordingly:

```
TRIVIAL → Identity + Task + Constraints
SIMPLE  → Identity + Task + Patterns + Constraints
STANDARD → Identity + Task + Brief + Patterns + Registry + Constraints
COMPLEX  → Full current template (all sections)
```

---

## 2. Attention-Optimized Prompt Ordering (KV-Cache)

Order prompt sections to maximize KV-cache hits and place critical information at attention-favored positions (start and end of context).

### Optimal Section Order

```
┌─────────────────────────────────────────────┐
│ 1. STABLE: Role identity + Rules (MANDATORY)│  ← Start (high attention)
│ 2. STABLE: Tech stack + TDD protocol        │  ← Cached across invocations
│ 3. STABLE: Constraints + Traceability       │  ← Cached across invocations
├─────────────────────────────────────────────┤
│ 4. SEMI-STABLE: Component Registry ref      │  ← Changes infrequently
│ 5. SEMI-STABLE: Product coding conventions  │  ← Changes per product
├─────────────────────────────────────────────┤
│ 6. VARIABLE: Patterns + Anti-patterns       │  ← Changes per task (middle)
│ 7. VARIABLE: Context from prior tasks       │  ← Changes per task
├─────────────────────────────────────────────┤
│ 8. CRITICAL: Current task + Acceptance      │  ← End (high attention)
│ 9. CRITICAL: When Complete (report format)  │  ← End (high attention)
└─────────────────────────────────────────────┘
```

**Rationale**: Stable sections at the top allow KV-cache prefix reuse (70%+ hit rate for same-agent invocations). Variable sections in the middle are the lowest-attention zone — acceptable because patterns are supplementary. The current task and completion instructions are at the end where attention is highest.

---

## 3. Context Degradation Awareness

### Five Failure Patterns to Monitor

| Pattern | Symptom | Mitigation |
|---------|---------|------------|
| **Lost-in-Middle** | Agent ignores instructions in middle of prompt | Move critical info to start/end |
| **Context Poisoning** | Error from tool output compounds in reasoning | Validate tool outputs before inclusion |
| **Context Distraction** | Irrelevant info dilutes focus | Strip non-essential context per task |
| **Context Confusion** | Agent mixes requirements from different sources | Isolate task context per sub-agent |
| **Context Clash** | Contradictory accumulated info derails reasoning | Use timestamps; prefer most recent |

### Degradation Thresholds

| Model | Degradation Onset | Severe Degradation |
|-------|------------------|--------------------|
| Claude Opus 4.6 | ~100K tokens | ~180K tokens |
| Claude Sonnet 4.6 | ~64K tokens | ~120K tokens |
| Claude Haiku 4.5 | ~32K tokens | ~64K tokens |

### Four-Bucket Strategy

When context approaches limits, apply in order:

1. **Write**: Persist large outputs to filesystem (scratchpad pattern)
2. **Select**: Retrieve only relevant context through filtering
3. **Compress**: Summarize older context using structured compression
4. **Isolate**: Split work across sub-agents with clean contexts

---

## 4. Observation Masking

Tool outputs consume 80%+ of token usage. Mask verbose observations after they've served their purpose.

### Rules
- Tool outputs from 3+ turns ago: replace with compact reference
- Repeated outputs (same tool, same args): keep only latest
- Boilerplate content (headers, footers, status bars): strip entirely
- **Preserve**: Current-task observations, recent-turn data, error messages

### Expected Impact
- 60-80% reduction in masked observations
- Proportional latency improvement

---

## 5. Token Budget Management

### Budget Allocation Per Sub-Agent Invocation

| Category | Budget % | Purpose |
|----------|----------|---------|
| System/Role | 10% | Identity, rules, tech stack |
| Task Context | 25% | Task description, acceptance criteria, upstream context |
| Reference Material | 20% | Patterns, brief, registry |
| Working Space | 45% | Reserved for tool outputs, reasoning, file reads |

### Monitoring Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| Context utilization | 70% | Trigger compression |
| Context utilization | 85% | Force compression + observation masking |
| Re-fetch rate | > 20% per session | Compression quality is too aggressive |
| Task token cost | 3x median for task type | Flag as potential degradation |

---

## 6. Sub-Agent Context Isolation

Sub-agents exist primarily to **isolate context**, not to simulate organizational roles. Each specialist agent gets a clean context window focused on its specific task.

### Rules
- The orchestrator NEVER accumulates full context from all workers
- Each sub-agent receives only the context relevant to its specific task
- Large intermediate outputs are written to the filesystem, not passed through the orchestrator
- Sub-agent reports are summarized before being added to orchestrator context

### File-System Coordination

```
products/{PRODUCT}/
├── .claude/
│   ├── scratch/          # Temporary agent outputs (large tool results)
│   ├── deliverables/     # Agent deliverables for CEO review
│   └── handoffs/         # Inter-agent communication files
```

Agents write large outputs to `scratch/`, deliverables to `deliverables/`, and handoff context to `handoffs/`. The orchestrator references file paths rather than including full content.

---

## References

- [Agent-Skills-for-Context-Engineering](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering)
- Context-fundamentals skill: Attention budget, U-shaped curves, progressive disclosure
- Context-degradation skill: Five failure patterns, four-bucket strategy
- Context-optimization skill: Compaction, observation masking, KV-cache
- Multi-agent-patterns skill: Context isolation, telephone game, token economics
- Filesystem-context skill: Scratch pad, plan persistence, sub-agent communication
- Tool-design skill: Consolidation principle, tool description engineering
