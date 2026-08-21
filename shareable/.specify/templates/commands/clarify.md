---
description: Identify underspecified areas in a feature spec and resolve them through targeted questions, encoding answers back into the spec.
agent: Product Manager
handoffs:
  - label: Build Technical Plan
    command: /speckit.plan
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

Goal: Detect and reduce ambiguity in the active feature specification. This MUST run before `/speckit.plan` if any `[NEEDS CLARIFICATION]` markers exist.

### Execution Steps

1. **Load the spec**: Read the feature spec from `products/[product]/docs/specs/[feature-name].md`
   - Also read `.specify/memory/constitution.md` for compliance context
   - If spec doesn't exist, instruct user to run `/speckit.specify` first

2. **Structured ambiguity scan** across these categories:

   | Category | What to Check |
   |----------|--------------|
   | Functional Scope | Core user goals, out-of-scope declarations, user roles |
   | Domain & Data | Entities, attributes, relationships, lifecycle/state transitions |
   | Interaction & UX | Critical user journeys, error/empty/loading states |
   | Non-Functional | Performance targets, scalability, reliability, observability |
   | Security & Privacy | AuthN/Z, data protection, compliance |
   | Integration | External services, APIs, failure modes |
   | Edge Cases | Negative scenarios, rate limiting, conflict resolution |
   | ConnectSW Specifics | Port assignments, component reuse, stack compliance |

   For each category, mark: **Clear** / **Partial** / **Missing**

3. **Generate up to 5 clarification questions** (maximum):
   - Each question MUST be answerable with short multiple-choice (2-5 options) or short answer (<=5 words)
   - Only include questions whose answers materially impact architecture, data modeling, task decomposition, or test design
   - Provide a **Recommended** option with reasoning for each question
   - Present ONE question at a time, sequentially

4. **For each accepted answer**:
   - Add to `## Clarifications` section in the spec (create if missing)
   - Format: `- Q: <question> → A: <final answer>`
   - Update the relevant spec section (requirements, edge cases, etc.)
   - Remove any `[NEEDS CLARIFICATION]` markers that were resolved
   - Save the spec file after each integration

5. **Report completion**:
   - Number of questions asked & answered
   - Spec file path
   - Sections updated
   - Coverage summary table (each category: Resolved / Deferred / Clear / Outstanding)
   - Suggested next step: `/speckit.plan` or another `/speckit.clarify` round

### Rules

- Maximum 5 questions per session
- Never reveal future queued questions
- If no meaningful ambiguities found: "No critical ambiguities detected" → suggest `/speckit.plan`
- Respect early termination signals ("done", "good", "proceed")
- Avoid speculative tech stack questions (those belong in plan phase)
