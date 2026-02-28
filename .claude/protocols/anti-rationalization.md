# Anti-Rationalization Framework

**Inspired by**: [obra/superpowers](https://github.com/obra/superpowers) — adapted for ConnectSW's agent system.

**Purpose**: AI agents systematically rationalize skipping quality processes. This framework provides explicit counters to the most common rationalizations, making it harder for agents to talk themselves out of TDD, verification, testing, and documentation.

---

## The Core Problem

Agents follow instructions well *in principle* but frequently convince themselves that specific situations are exceptions. They generate plausible-sounding reasons to skip steps: "this is too simple to test," "I'll add tests after," "the existing tests cover this." These rationalizations compound — one skipped test leads to another, and quality erodes.

This framework makes the rationalizations explicit and provides mandatory counters.

---

## The 1% Rule (Constitution Article XI)

**If there is even a 1% chance that a protocol, quality gate, or verification step applies to the current task, it MUST be invoked.**

Do not optimize for speed by skipping steps. The cost of running an unnecessary check is minutes. The cost of skipping a necessary one is hours of debugging, rework, or a production incident.

---

## TDD Anti-Rationalizations

These are the most common excuses agents use to skip writing tests first. Each has an explicit counter that agents MUST follow.

### Rationalization 1: "This is too simple to need a test"

**Counter**: Simple code has the highest ROI for tests. A test for simple code takes 30 seconds to write and runs in milliseconds. It catches regressions forever. Write the test.

**Rule**: If it has logic (even an `if` statement, a calculation, or a data transformation), it needs a test.

### Rationalization 2: "I'll add tests after the implementation"

**Counter**: You won't. Once the code works, the psychological incentive to write tests drops to near zero. Tests written after implementation are also weaker — they test what the code does rather than what it *should* do. Write the test first.

**Rule**: No implementation code may be committed without a corresponding test that was written *before* the implementation.

### Rationalization 3: "The existing tests already cover this"

**Counter**: Prove it. Name the specific test. Show its output. If you cannot point to a specific test that exercises the exact behavior you're implementing, you need a new test.

**Rule**: When claiming existing coverage, cite the test by name and file path. Run it and show the output.

### Rationalization 4: "This is just a refactor — behavior doesn't change"

**Counter**: If behavior doesn't change, existing tests should still pass. Run them. If they pass, you're right — no new tests needed. If they fail, you changed behavior and need to update tests. Either way, run the tests.

**Rule**: Refactors require running the full test suite before and after. If no tests exist for the refactored code, write them first.

### Rationalization 5: "I'm just fixing the test setup / configuration"

**Counter**: Configuration changes can break the entire test suite. Make the change, run all tests, verify everything passes. If tests were already broken, fix them.

**Rule**: After any test infrastructure change, the full suite must run green.

### Rationalization 6: "This is UI/styling only — no logic to test"

**Counter**: Styling bugs are the #1 source of CEO demo failures. The QA Engineer's visual verification exists specifically for this. If it's a component, it needs a render test. If it's a page, it needs an E2E test.

**Rule**: Every component gets a render test. Every page gets an E2E test. No exceptions.

### Rationalization 7: "I'm blocked by a dependency — I'll skip the test for now"

**Counter**: If you're blocked, you're not ready to implement. Solve the blocker first. If the blocker is another agent's work, write the test with a clear `TODO: unblock when [dependency] is ready` and move on to a different task.

**Rule**: Never skip a test due to a blocker. Write the test or wait for the blocker to clear.

### Rationalization 8: "The test framework isn't set up yet for this product"

**Counter**: Setting up the test framework IS the first task. Before any feature code, configure Jest/Vitest/Playwright. This is the foundation. See `.claude/COMPONENT-REGISTRY.md` for reusable test configs.

**Rule**: Test framework setup is Task 0 for every product. No feature code before test infrastructure.

### Rationalization 9: "This is a one-time script / migration / seed file"

**Counter**: Migrations run in production. Seed files run in every environment. Scripts get reused. These are some of the most dangerous code to leave untested because they're hard to roll back.

**Rule**: Migrations need a test that runs the migration forward and verifies schema. Seed files need a test that verifies data integrity.

### Rationalization 10: "I need to prototype first, then add tests"

**Counter**: Prototyping without tests means you're building on an unverified foundation. Write a minimal test for the core behavior, then prototype around it. The test anchors your prototype to reality.

**Rule**: Even prototypes get a minimal test for their core behavior.

### Rationalization 11: "The deadline is tight — testing would slow us down"

**Counter**: Testing saves time. Research shows TDD reduces debugging iterations by 54% (see Development-Oriented Testing protocol). Skipping tests creates debt that costs 10x to fix later.

**Rule**: Deadlines are never a valid reason to skip tests. If the deadline is genuinely too tight, reduce scope — don't reduce quality.

### Rationalization 12: "This is just glue code connecting two tested components"

**Counter**: Integration is where most bugs live. Two individually tested components can fail when connected due to contract mismatches, timing issues, or data format differences. The glue is the most important code to test.

**Rule**: Integration code always needs an integration test.

---

## Process Anti-Rationalizations

### Rationalization P1: "I don't need to check the Component Registry — I know what I'm building"

**Counter**: The registry has 60+ components. You cannot hold all of them in memory. A 30-second check prevents hours of rebuilding something that already exists and is production-tested.

**Rule**: Check the registry. Always. (Constitution Article II)

### Rationalization P2: "I'll add the diagram later"

**Counter**: "Later" means never. The diagram clarifies your thinking NOW and prevents miscommunication with other agents. Draw it before or during implementation.

**Rule**: Diagrams are a first-class deliverable, not an afterthought. (Constitution Article IX)

### Rationalization P3: "The spec is clear enough — clarification would just slow things down"

**Counter**: Ambiguous specs are the #1 cause of rework at ConnectSW. A 5-minute clarification prevents a 5-hour rebuild. If you think you understand but aren't 100% certain, you don't understand.

**Rule**: Any uncertainty must be resolved via `/speckit.clarify` before implementation begins. (Constitution Article I)

### Rationalization P4: "I'll update the traceability later"

**Counter**: Traceability without enforcement is aspirational. Add requirement IDs to commits, tests, and code headers as you write them — not after. It takes 5 seconds per artifact.

**Rule**: Every commit, test name, and route handler gets traceability IDs at creation time. (Constitution Article VI)

### Rationalization P5: "This change is small enough that I don't need a PR"

**Counter**: Small changes cause big outages. Every change goes through a PR. Period.

**Rule**: No direct commits to main. All work on branches with PR review. (Constitution Article VIII)

### Rationalization P6: "I don't need to check if this is already implemented — the spec wouldn't ask for it if it existed"

**Counter**: Specs are written from requirements, not from codebase audits. The spec author may not know what previous sprints delivered. The stablecoin-gateway audit found 4 P0/P1 items that were already fully implemented — CI/CD, correlation IDs, admin seed, and structured logging. Checking takes seconds; rebuilding takes hours.

**Rule**: Run the Verification-Before-Planning gate (`.claude/protocols/verification-before-planning.md`) before generating plans or tasks. Every capability must be verified as not-yet-implemented before it appears in a task list. (Constitution Article II)

---

## Applying This Framework

### For Engineer Agents (Backend, Frontend, Mobile)

Before writing any implementation code, ask yourself:

1. **Did I write the test first?** If no → write the test.
2. **Am I rationalizing skipping the test?** If yes → re-read the relevant counter above.
3. **Did I check the Component Registry?** If no → check it.
4. **Did I verify this isn't already implemented?** If no → run the Verification-Before-Planning gate.
5. **Does my commit include traceability IDs?** If no → add them.
6. **Would this benefit from a diagram?** If maybe → draw it (1% Rule).

### For QA Engineer

When reviewing agent work, check for signs of skipped TDD:
- Implementation committed before test
- Tests that test implementation details (not behavior)
- Missing edge case tests
- No integration tests for glue code

### For Orchestrator

When routing tasks, include this reminder in every implementation task assignment:

> **Anti-Rationalization Check**: This task requires TDD. Write failing tests before implementation code. If you believe this task is an exception to TDD, explain why in your handoff — the QA Engineer will evaluate your reasoning.

---

## Escalation

If an agent genuinely believes a task is an exception to these rules:

1. Document the specific rationalization and why the counter doesn't apply
2. Include this documentation in the task handoff
3. The QA Engineer reviews the reasoning
4. Only the CEO can override a TDD requirement

The bar for exceptions is intentionally high. The default is always: follow the process.
