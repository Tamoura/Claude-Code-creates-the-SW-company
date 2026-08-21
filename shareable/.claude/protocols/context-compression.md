# Context Compression Protocol

**Version**: 1.0.0
**Created**: 2026-02-25
**Source**: Adapted from Agent-Skills-for-Context-Engineering (context-compression skill)

## Purpose

When agent sessions generate massive conversation histories, context compression prevents degradation. This protocol defines **Anchored Iterative Summarization** — the highest-quality compression method (98.6% compression, 3.70/5.0 quality score).

---

## Key Principle

Optimize for **tokens-per-task** (total tokens from start to completion), not tokens-per-request. Aggressive compression that causes re-fetching costs more overall than slightly larger summaries that preserve critical context.

---

## Compression Trigger

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Context utilization | 70% | Begin structured summary |
| Context utilization | 85% | Force compression + observation masking |
| Task boundary | Logical task completion | Compress completed task context |
| Turn count | > 20 turns in session | Evaluate for compression |

---

## Structured Summary Template

When compression triggers, the agent maintains a summary file at:
`products/{PRODUCT}/.claude/scratch/session-summary-{TASK_ID}.md`

```markdown
## Session Summary — {TASK_ID}

### Session Intent
What this session is trying to accomplish. Updated only if scope changes.

### Files Modified
| File | Action | What Changed |
|------|--------|-------------|
| path/to/file.ts | created | New auth service with login/register |
| path/to/other.ts | modified | Added validation to signup endpoint |

### Files Read (Not Modified)
- path/to/reference.ts — Read for import patterns
- path/to/schema.prisma — Checked existing data model

### Decisions Made
1. Used SHA-256 for token hashing (not bcrypt) because tokens need comparison, not verification
2. Chose route-level auth middleware over global middleware for granular control

### Current State
- 3/5 endpoints implemented (login, register, logout done; reset-password, verify-email pending)
- All tests passing (12 unit, 4 integration)
- No blockers

### Next Steps
1. Implement password reset flow with email token
2. Implement email verification endpoint
3. Add rate limiting to auth endpoints

### Error Context (if any)
- Previous attempt at Redis session store failed due to missing REDIS_URL — switched to JWT
```

---

## Compression Workflow

### Step 1: Summarize Newly-Truncated Content
When the system compresses context, summarize ONLY the newly-truncated portion. Do not regenerate the entire summary.

### Step 2: Merge Incrementally
Merge the new summary with the existing structured summary:
- **Session Intent**: Update only if scope changed
- **Files Modified**: Append new entries; update existing entries if the same file was modified again
- **Decisions Made**: Append new decisions
- **Current State**: Replace entirely (always reflects latest state)
- **Next Steps**: Replace entirely (always reflects latest plan)
- **Error Context**: Replace if resolved; append if new errors

### Step 3: Validate with Probes
After compression, verify quality with functional probes:

| Probe Type | Example Question | Tests |
|------------|-----------------|-------|
| Recall | "What was the original error message?" | Accuracy |
| Artifact | "Which files have we modified?" | File tracking |
| Continuation | "What should we do next?" | State continuity |
| Decision | "Why did we choose JWT over sessions?" | Decision preservation |

If any probe fails (agent can't answer from summary), the compression was too aggressive — expand the relevant section.

---

## Compression by Phase

### Research Phase
Produce structured analysis from architecture docs and codebase exploration.
- Compress into: problem statement, key findings, relevant file paths, constraints discovered
- Target: 500-1000 words

### Planning Phase
Convert research into implementation specification.
- Compress into: function signatures, type definitions, API contracts, data models
- Target: 1000-2000 words (a 5M token codebase compresses to ~2,000 words)

### Implementation Phase
Execute against the specification from the planning phase.
- Compress completed work into session summary template above
- Keep active work uncompressed

---

## Artifact Trail (Critical Weakness)

File tracking is the weakest dimension across ALL compression methods (2.2-2.5/5.0 scores). To counteract this:

1. **Dedicated Files Modified section**: Always maintain as a table with structured columns
2. **Never compress file paths**: File paths are cheap (token-wise) but expensive to re-discover
3. **Action verbs**: Use created/modified/deleted — never just "changed"
4. **What changed column**: Brief description prevents needing to re-read the file

---

## Quality Metrics

| Dimension | Score Target | What It Measures |
|-----------|-------------|-----------------|
| Accuracy | >= 4.0/5.0 | Technical correctness of preserved details |
| Context Awareness | >= 4.0/5.0 | Reflects current conversation state |
| Artifact Trail | >= 3.5/5.0 | Knowledge of read/modified files |
| Completeness | >= 3.5/5.0 | All relevant information preserved |
| Continuity | >= 4.0/5.0 | Work continues without re-fetching |
| Instruction Following | >= 4.0/5.0 | Respects stated constraints |

---

## Integration with Orchestrator

When the orchestrator spawns a sub-agent that needs to continue prior work:

1. Check if `products/{PRODUCT}/.claude/scratch/session-summary-{TASK_ID}.md` exists
2. If yes: include the summary in the sub-agent prompt under `## Prior Session Context`
3. If no: this is a fresh task, proceed normally

When a sub-agent session hits compression triggers:
1. Write/update the session summary file
2. Continue working from the summary
3. On task completion, the summary becomes part of the handoff context
