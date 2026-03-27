# Multi-Model Review Protocol

**Version**: 1.0.0
**Created**: 2026-03-27
**Inspired by**: gstack `/codex` — OpenAI second opinion for independent review
**Applies to**: Architect, Code Reviewer, Security Engineer

---

## Purpose

Cross-validate critical decisions by soliciting independent analysis from a different AI model. Reduces blind spots from single-model reasoning and catches errors that same-model review might miss.

## When to Use

| Scenario | Required? | Rationale |
|----------|-----------|-----------|
| Architecture decisions (ADRs) | Recommended | Different models may spot scalability issues |
| Security audit findings | Recommended | Cross-validate vulnerability assessments |
| Complex algorithm design | Optional | Alternative implementation approaches |
| Production incident RCA | Recommended | Independent root cause analysis |
| Spec ambiguity resolution | Optional | Fresh interpretation of requirements |
| Performance optimization | Optional | Alternative optimization strategies |

**NOT for**: Routine code review, simple bug fixes, documentation, test writing.

## Review Modes

### Mode 1: Independent Review

The second model receives the same inputs but NO knowledge of the first model's conclusions.

```markdown
## Second Opinion Request — Independent Review

### Context
[Paste the same context the primary agent received]

### Question
[Same question / decision to be made]

### Constraints
- Do NOT reference any prior analysis
- Provide your own independent assessment
- Flag any risks or concerns you identify
```

**Use when**: You want to see if two models reach the same conclusion independently.

### Mode 2: Adversarial Challenge

The second model receives the first model's conclusion and actively tries to find flaws.

```markdown
## Second Opinion Request — Adversarial Review

### Proposed Decision
[The primary agent's recommendation]

### Rationale Given
[The primary agent's reasoning]

### Your Task
- Find weaknesses in this reasoning
- Identify unstated assumptions
- Propose failure scenarios
- Rate confidence: HIGH / MEDIUM / LOW that this decision is correct
```

**Use when**: You have a decision but want stress-testing before committing.

### Mode 3: Consultation

Open-ended discussion where both models' perspectives are synthesized.

```markdown
## Second Opinion Request — Open Consultation

### Topic
[The architectural/design question]

### First Model's Take
[Summary of primary analysis]

### Please Provide
- Your perspective on this topic
- Areas of agreement/disagreement
- Alternative approaches not yet considered
- Recommended path forward with trade-offs
```

**Use when**: Complex decisions with multiple valid approaches.

## Integration Points

### With Architect Agent

Before finalizing an ADR, the Architect can request multi-model review:

```markdown
## ADR Multi-Model Review

ADR: [title]
Decision: [chosen option]
Alternatives considered: [list]

Request: Adversarial review of this architectural decision.
Focus areas: scalability, maintainability, security implications.
```

### With Code Reviewer Agent

For critical code paths (auth, payments, data handling):

```markdown
## Code Multi-Model Review

File: [path]
Function: [name]
Purpose: [what it does]
Security context: [auth/payments/PII/etc.]

Request: Independent security review.
```

### With Security Engineer Agent

For vulnerability assessments:

```markdown
## Security Multi-Model Review

Finding: [vulnerability description]
Severity: [CRITICAL/HIGH/MEDIUM/LOW]
Proposed fix: [remediation]

Request: Validate severity assessment and fix completeness.
```

## Output Format

```markdown
## Multi-Model Review Results

### Primary Analysis (Claude)
[Summary of primary model's conclusion]

### Second Opinion ([Model Name])
[Summary of second model's conclusion]

### Agreement
- [Points where both models agree]

### Divergence
- [Points where models disagree, with each model's reasoning]

### Synthesis
[Final recommendation incorporating both perspectives]

### Confidence Level
PRIMARY: HIGH / MEDIUM / LOW
SECONDARY: HIGH / MEDIUM / LOW
COMBINED: HIGH / MEDIUM / LOW
```

## Model Selection

| Use Case | Recommended Second Model | Rationale |
|----------|-------------------------|-----------|
| Architecture review | GPT-4o / Gemini Pro | Different training data → different architectural intuitions |
| Security audit | GPT-4o / Gemini Pro | Cross-validate vulnerability detection |
| Algorithm design | Gemini Pro | Strong at mathematical reasoning |
| UX review | GPT-4o | Strong at user-facing analysis |
| General code review | Any available | Diversity of perspective is the goal |

## Cost Considerations

Multi-model review adds API cost and latency. Use judiciously:

- **Always worth it**: Security-critical code, architectural decisions, production incident RCA
- **Usually worth it**: Complex business logic, performance-critical paths
- **Rarely worth it**: CRUD endpoints, simple UI components, documentation

## Enforcement

- Multi-model review is **RECOMMENDED**, never mandatory
- The Orchestrator logs when multi-model review was used (or skipped) in the audit trail
- For security findings rated CRITICAL, multi-model review is **STRONGLY RECOMMENDED**

## Cross-References
- Code Review Gate: Constitution Article XIV
- Security: `.claude/protocols/secure-coding.md`
- Architecture: Architect agent definition
- Quality Verification: `.claude/protocols/quality-verification.md`
