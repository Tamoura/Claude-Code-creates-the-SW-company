# Verification-Before-Completion Protocol

**Inspired by**: [obra/superpowers](https://github.com/obra/superpowers) — adapted for ConnectSW's agent system.

**Purpose**: Prevent agents from claiming a task is "done" without evidence. No agent may mark a task as complete by saying "should work" or "this looks correct." Every completion claim must include verifiable evidence.

---

## The Core Problem

Agents frequently report task completion based on their belief that the code is correct, rather than verified evidence. Common failure modes:

- "I wrote the code and it looks correct" → but never ran it
- "The tests should pass" → but didn't run them
- "The endpoint is working" → but never made a real HTTP request
- "The UI renders correctly" → but never opened a browser
- "The migration ran successfully" → but never checked the database state

These unverified claims waste downstream time — the QA Engineer, Code Reviewer, or CEO discovers the issue, routes it back, and the original agent debugs. The fix is simple: require evidence before any completion claim.

---

## The Five-Step Verification Gate

Before marking ANY task as complete, agents MUST complete all five steps in order. No step may be skipped.

### Step 1: Identify the Verification Command

Before claiming completion, explicitly state what command or action will prove the work is correct.

```
VERIFY: What specific command will I run to prove this works?

Examples:
- "npm test -- --testPathPattern=users.test.ts"
- "curl -X POST http://localhost:5001/api/v1/users -H 'Content-Type: application/json' -d '{...}'"
- "npx playwright test tests/auth/login.spec.ts"
- "npx prisma migrate status"
- "npm run build"
```

**If you cannot identify a verification command, the task is not well-defined enough to complete.**

### Step 2: Execute the Verification

Run the command identified in Step 1. Do not predict the output — run it and observe the actual result.

```
EXECUTE: Run the verification command and capture output.

- Run the exact command from Step 1
- Capture the full output (not a summary)
- If the command fails, this is NOT a completion — it's a bug to fix
```

### Step 3: Read the Actual Output

Read the output from Step 2 carefully. Do not skim. Do not assume.

```
READ: Examine the actual output for:

- Did the command exit with code 0?
- Did all tests pass? (check the count — "5 passed" not "tests passed")
- Did the HTTP response return the expected status code and body?
- Did the build complete without warnings or errors?
- Are there any deprecation warnings that indicate future breaks?
```

### Step 4: Compare Against Expected Results

Compare what you observed in Step 3 against what the task required.

```
COMPARE: Match output against acceptance criteria.

- Does the test output match ALL acceptance criteria from the spec?
- Does the API response match the contract (status code, body shape, headers)?
- Does the UI match the design (layout, colors, interactive elements)?
- Does the database state match expectations (records created, constraints intact)?
- Are there ANY discrepancies between expected and actual?
```

### Step 5: Claim Completion With Evidence

Only now may you claim the task is complete. The claim MUST include the evidence.

```
COMPLETE: Task [ID] verified.

Evidence:
- Command run: [exact command]
- Output: [key output lines or summary]
- Tests: [X passed, 0 failed]
- Manual verification: [what was checked and result]
- Discrepancies: [none / list any with justification]
```

---

## Verification Requirements by Task Type

### Backend API Tasks

```
REQUIRED EVIDENCE:
1. Tests pass: Run `npm test` — show pass count and 0 failures
2. Real HTTP request: Make actual curl/fetch request to the endpoint
3. Response matches contract: Show status code and response body
4. Error cases tested: Show responses for 400, 401, 404, 409 paths
5. Database state verified: Query the database to confirm records
```

### Frontend UI Tasks

```
REQUIRED EVIDENCE:
1. Tests pass: Run `npm test` — show pass count and 0 failures
2. Dev server runs: `npm run dev` starts without errors
3. Page loads: Browser shows the page without console errors
4. Visual check: All elements visible, styled, and interactive
5. Build succeeds: `npm run build` completes without errors
```

### Database / Migration Tasks

```
REQUIRED EVIDENCE:
1. Migration runs: `npx prisma migrate dev` succeeds
2. Schema matches: `npx prisma migrate status` shows no pending migrations
3. Data integrity: Query tables to verify FK constraints intact
4. Rollback tested: Migration can be reversed without data loss
```

### E2E Test Tasks

```
REQUIRED EVIDENCE:
1. Tests pass: `npx playwright test` — show pass count
2. All browsers: Tests pass in chromium, firefox, webkit (or specified subset)
3. Screenshots: On-failure screenshots captured (no failures = no screenshots = good)
4. Coverage: All acceptance criteria from spec have corresponding tests
```

### Documentation Tasks

```
REQUIRED EVIDENCE:
1. Diagrams render: Mermaid syntax validates (no parse errors)
2. Links work: All internal links resolve to existing files
3. Completeness: All required sections present per Constitution Article IX
4. Accuracy: Technical details match actual implementation
```

---

## Integration with Quality Gates

The Verification-Before-Completion protocol operates at the **individual task level**, complementing the quality gates which operate at the **milestone level**.

```
Individual Task Level:              Milestone Level:
┌─────────────────────┐            ┌────────────────────────┐
│  Agent works on task │            │  All tasks in milestone │
│         ↓            │            │  marked complete        │
│  5-Step Verification │            │         ↓               │
│         ↓            │            │  Gate -1: Spec Check    │
│  Task marked done    │ ───────→   │  Gate 0:  Browser       │
│  with evidence       │            │  Gate 1:  Security      │
└─────────────────────┘            │  Gate 3:  Testing       │
                                   │         ↓               │
                                   │  CEO Checkpoint         │
                                   └────────────────────────┘
```

The verification gate catches issues at the source. Quality gates catch issues that slip through. Together, they create defense in depth.

---

## Handoff Format

When handing off completed work to the next agent (or back to the Orchestrator), use this format:

```markdown
## Task Completion: [TASK-ID] — [Task Name]

### What Was Done
[Brief description of the implementation]

### Verification Evidence

**Tests**:
- Command: `npm test -- --testPathPattern=users`
- Result: 8 passed, 0 failed, 0 skipped
- Coverage: 92% statements, 88% branches

**Manual Verification**:
- Endpoint tested: POST /api/v1/users → 201 Created
- Error paths: 400 (invalid email), 409 (duplicate) → verified
- Database: User record created with hashed password ✓

**Build**:
- Command: `npm run build`
- Result: Compiled successfully

### Spec Traceability
- Implements: [US-01][FR-003] — User Registration
- Tests: [US-01][AC-1], [US-01][AC-2], [US-01][AC-3]

### Notes for Next Agent
[Any context the next agent needs]
```

---

## Enforcement

### Orchestrator Responsibility

The Orchestrator MUST reject task completion reports that lack verification evidence. When an agent reports a task as complete:

1. Check for the "Verification Evidence" section
2. Verify it contains the required evidence for the task type
3. If missing → return to agent with: "Task completion requires verification evidence. See `.claude/protocols/verification-before-completion.md`."

### QA Engineer Responsibility

During the Testing Gate, the QA Engineer checks that all completed tasks have verification evidence in their handoff reports. Missing evidence is a FAIL condition.

### Agent Self-Check

Every agent MUST ask themselves before reporting completion:

> "If someone re-ran my verification steps right now, would they get the same results I'm claiming?"

If the answer is not a confident "yes," the task is not complete.
