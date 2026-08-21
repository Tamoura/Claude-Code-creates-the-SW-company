# Relevance Scoring Rubric for Memory Injection

## Overview

This document describes the 5-dimension scoring rubric used by the orchestrator (Step 3.5) to semantically match company knowledge patterns to specific tasks and agents. It replaces the previous category-based filtering with task-aware scoring.

## Scoring Dimensions (0-10 total)

### A. Task Description Match (0-3 points)

Semantic similarity between the task description and pattern's `problem`, `solution`, and `when_to_use` fields.

| Score | Criteria |
|-------|----------|
| 3 | Pattern directly addresses the task's core problem (e.g., task is "implement webhook idempotency", pattern solves "duplicate webhook deliveries") |
| 2 | Pattern is clearly relevant to the task domain (e.g., task is "build payment API", pattern covers "Fastify plugin registration") |
| 1 | Pattern is tangentially related (e.g., task is "build dashboard", pattern covers "Tailwind content paths") |
| 0 | No meaningful connection between task and pattern |

**How to evaluate**: Compare the task description against the pattern's `problem` and `when_to_use` fields. Look for:
- Shared domain concepts (webhooks, auth, payments, etc.)
- Similar technical challenges (idempotency, validation, testing)
- Matching architectural patterns (service layer, plugin registration)

### B. Product Context Match (0-2 points)

Match between the pattern's origin (`learned_from.product`, `applies_to`) and the current product being worked on.

| Score | Criteria |
|-------|----------|
| 2 | Pattern was learned from the same product, or `applies_to` explicitly includes this product |
| 1 | Pattern was learned from a product with similar tech stack or domain |
| 0 | Pattern is from an unrelated product with no overlap |

### C. Agent Role Fit (0-2 points)

How relevant the pattern is to the assigned agent's core responsibilities.

| Score | Criteria |
|-------|----------|
| 2 | Core to the agent's role (e.g., "Fastify plugin order" for Backend Engineer) |
| 1 | Adjacent — useful context but not the agent's primary domain (e.g., "Fastify plugin order" for QA Engineer writing integration tests) |
| 0 | Irrelevant to the agent's role (e.g., "Tailwind CSS" for DevOps Engineer) |

### D. Historical Success (0-2 points)

Based on the pattern's `confidence` field and `times_applied` count.

| Score | Criteria |
|-------|----------|
| 2 | `confidence: "high"` AND `times_applied >= 3` — proven pattern |
| 1 | `confidence: "high"` with fewer applications, or `confidence: "medium"` |
| 0 | `confidence: "low"` or untested pattern |

### E. Recency Bonus (0-1 point)

Patterns learned within the last 30 days get a bonus.

| Score | Criteria |
|-------|----------|
| 1 | Pattern `learned_from.date` is within last 30 days |
| 0 | Pattern is older than 30 days |

## Selection Thresholds

| Condition | Action |
|-----------|--------|
| Score >= 7 | Include pattern with full code snippet |
| Score >= 4 | Include pattern (description + solution only) |
| Score >= 3 (fallback) | Include if fewer than 3 patterns qualified at >= 4 |
| Score < 3 | Exclude |

**Maximum patterns injected**: 5 (ranked by score descending)

## Anti-Pattern Scoring

Anti-patterns use a simplified 2-dimension scoring (dimensions A + C only):
- **Task match (0-3)**: Does the anti-pattern's problem relate to this task?
- **Agent role fit (0-2)**: Is the anti-pattern relevant to this agent?
- **Threshold**: Score >= 3 to include

**Maximum anti-patterns injected**: 3

## Gotcha Scoring

Gotchas are matched by `category` field against the agent's domain and the task's technical area:
- Include gotchas where category matches the agent's primary domain
- Include gotchas where category matches keywords in the task description
- **Maximum gotchas injected**: 3

## Agent Experience Injection

For each agent, also extract from their experience file (`.claude/memory/agent-experiences/{agent}.json`):
- `common_mistakes`: Inject all (typically 0-3 items)
- `preferred_approaches`: Inject all (typically 0-3 items)

These are always included regardless of scoring — they are the agent's own learnings.

## Injection Format

```markdown
## Relevant Patterns (semantically matched, score >= 4/10)
- PATTERN-014 (score: 9/10, confidence: high): "Webhook Queue with Idempotency"
  Problem: "Duplicate webhook deliveries..."
  Solution: "Use idempotency keys..."
  Code: {snippet — only for score >= 7}

## Anti-Patterns to Avoid
- ANTI-001: "Using Mocks in E2E Tests" → Use real services with buildApp()

## Gotchas
- "Port conflicts" → Use PORT-REGISTRY.md, ports 3100+ for frontend

## Your Past Experience
- Common mistake to avoid: "Missing Zod validation" → Always validate input
- Preferred approach for API routes: "Route → Schema → Handler → Service"
```

## Maintenance

When modifying this rubric:
1. Update the scoring criteria in this document
2. Update Step 3.5 in `orchestrator-enhanced.md` to match
3. Update the injection format in `orchestrator.md` (commands)
4. Test with a sample task to verify scoring produces good results
