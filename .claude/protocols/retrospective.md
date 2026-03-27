# Retrospective Protocol

**Version**: 1.0.0
**Created**: 2026-03-27
**Inspired by**: gstack `/retro` — engineering manager analyzing commit history and growth
**Applies to**: Orchestrator, all agents (post-milestone)

---

## Purpose

Analyze completed work to identify patterns, celebrate contributions, detect test health trends, and surface improvement opportunities. Retrospectives feed the **memory system** (`.claude/memory/`) to make agents smarter over time.

## When to Run

| Trigger | Scope | Who Initiates |
|---------|-------|---------------|
| After CEO Checkpoint (any) | Current milestone | Orchestrator (automatic) |
| After Production Gate PASS | Full release | Orchestrator (automatic) |
| On CEO request ("retro" / "status") | Specified scope | Orchestrator |
| Weekly (if active development) | Past 7 days | Orchestrator (scheduled) |

## Retrospective Dimensions

### 1. Commit Analysis

```bash
# Gather data for the retrospective period
git log --since="$START_DATE" --until="$END_DATE" \
  --pretty=format:"%H|%an|%ad|%s" --date=short

# Categorize by type
git log --since="$START_DATE" --oneline | grep -c "^.*feat"    # Features
git log --since="$START_DATE" --oneline | grep -c "^.*fix"     # Bug fixes
git log --since="$START_DATE" --oneline | grep -c "^.*test"    # Tests
git log --since="$START_DATE" --oneline | grep -c "^.*refactor" # Refactors
git log --since="$START_DATE" --oneline | grep -c "^.*docs"    # Documentation
```

**Output:**
```markdown
### Commit Summary
- Total commits: NN
- Features: NN (XX%)
- Bug fixes: NN (XX%)
- Tests: NN (XX%)
- Refactors: NN (XX%)
- Documentation: NN (XX%)
- Other: NN (XX%)
```

### 2. Agent Contribution Map

Track which agents (via commit messages or branch names) contributed what:

```markdown
### Agent Contributions
| Agent | Commits | Files Changed | Lines Added | Lines Removed |
|-------|---------|---------------|-------------|---------------|
| Backend Engineer | 12 | 34 | 1,200 | 400 |
| Frontend Engineer | 8 | 22 | 800 | 150 |
| QA Engineer | 6 | 15 | 600 | 50 |
| ... | ... | ... | ... | ... |
```

### 3. Test Health Trend

```bash
# Current test metrics
npm test -- --coverage --json 2>/dev/null | jq '.coverageMap'

# Track over time in memory
{
  "date": "2026-03-27",
  "product": "connectin",
  "total_tests": 142,
  "passing": 140,
  "failing": 2,
  "coverage": {
    "statements": 84.2,
    "branches": 78.5,
    "functions": 88.1,
    "lines": 85.0
  }
}
```

**Health Indicators:**
- Coverage trending UP = healthy
- Coverage trending DOWN = flag for Orchestrator
- Failing tests > 0 for > 1 day = urgent (file issue)
- Test-to-code ratio < 0.3 = under-tested

### 4. Velocity & Complexity

```markdown
### Velocity Metrics
- Story points completed: NN (if tracked)
- User stories closed: US-01 through US-08
- Requirements covered: FR-001 through FR-024 (24/30 = 80%)
- Average time per story: X.X days
- Blocked time: X hours (reasons: ...)
```

### 5. Quality Signals

```markdown
### Quality Indicators
| Signal | Status | Trend |
|--------|--------|-------|
| CI pass rate | 94% | ↑ (was 88%) |
| Avg build time | 2m 30s | → (stable) |
| Security vulns found | 2 low | ↓ (was 3 medium) |
| E2E test flakiness | 1/50 tests | → (stable) |
| Code review iterations | 1.2 avg | ↓ (improving) |
```

### 6. What Went Well / What Could Improve

Structured analysis (not subjective feelings):

```markdown
### What Went Well (Evidence-Based)
- Component reuse saved ~4 hours: Auth plugin reused from stablecoin-gateway
- TDD caught regression in payment flow before it reached QA
- Parallel agent execution reduced architecture phase from 2 days to 4 hours

### What Could Improve (Action Items)
- [ ] E2E test for RTL layout is flaky — needs fixed selector (assign: QA Engineer)
- [ ] Cookie auth testing not yet automated — adopt browser automation protocol
- [ ] Design review was skipped for settings page — schedule audit
```

### 7. Patterns Discovered

New patterns and anti-patterns to feed into the memory system:

```markdown
### New Patterns (add to company-knowledge.json)
- Pattern: "Fastify plugin registration order matters for auth"
  Context: Auth plugin must register before route plugins
  Score: 8/10 relevance

### Anti-Patterns Observed
- Anti-pattern: "Inline styles in React components"
  Fix: Use Tailwind utility classes per design system
  Frequency: 3 occurrences this sprint
```

## Output Format

Full retrospective saved to: `$PRODUCT_DIR/docs/retros/retro-YYYY-MM-DD.md`

```markdown
# Retrospective: [Product] — [Milestone/Date Range]

**Period**: YYYY-MM-DD to YYYY-MM-DD
**Milestone**: [e.g., "Foundation Complete" / "Feature: Dark Mode" / "v1.0 Release"]

## Summary
[2-3 sentence executive summary]

## Metrics Dashboard
[Tables from sections 1-5 above]

## What Went Well
[Section 6 — evidence-based]

## What Could Improve
[Section 6 — with action items]

## Patterns & Learnings
[Section 7 — feed into memory]

## Action Items
| # | Action | Owner | Priority | Due |
|---|--------|-------|----------|-----|
| 1 | Fix flaky RTL E2E test | QA Engineer | High | Next sprint |
| 2 | Add browser automation to QA flow | DevOps | Medium | Next sprint |
| ... | ... | ... | ... | ... |
```

## Memory System Integration

After each retrospective, the Orchestrator updates:

1. **`.claude/memory/company-knowledge.json`** — Add new patterns, update anti-patterns
2. **`.claude/memory/agent-experiences/{agent}.json`** — Update per-agent learnings
3. **`.claude/audit-trail.jsonl`** — Log retrospective event with findings

```json
{
  "event": "retrospective",
  "timestamp": "2026-03-27T12:00:00Z",
  "product": "connectin",
  "milestone": "foundation-complete",
  "metrics": {
    "commits": 45,
    "coverage": 84.2,
    "ci_pass_rate": 0.94,
    "stories_completed": 8
  },
  "patterns_added": 2,
  "action_items": 3
}
```

## Enforcement

- Retrospectives are **RECOMMENDED** after every CEO checkpoint
- Retrospectives are **MANDATORY** after Production Gate PASS
- Action items from retrospectives are tracked in the next sprint's task graph
- Orchestrator includes retro findings when spawning agents for the next milestone

## Cross-References
- Memory System: `.claude/memory/`
- Quality Verification: `.claude/protocols/quality-verification.md`
- Audit Trail: `.claude/audit-trail.jsonl`
- Constitution Article XI: Anti-Rationalization (retro catches rationalizations post-hoc)
