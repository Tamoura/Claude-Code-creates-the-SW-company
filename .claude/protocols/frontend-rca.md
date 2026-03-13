# Frontend Root Cause Analysis Protocol

Hypothesis-driven debugging workflow for systematically investigating frontend issues. Adapted from askjg-claude-agents patterns for ConnectSW.

## When to Use

- Frontend bugs that aren't immediately obvious
- UI issues that require reproduction and evidence gathering
- Complex state management bugs
- Rendering/hydration issues
- Performance regressions in the browser

## Agents That Use This Protocol

- **Support Engineer** — Primary user during bug investigation
- **Frontend Engineer** — When debugging complex UI issues
- **QA Engineer** — When investigating test failures with visual components

## The 10-Phase RCA Workflow

### Phase 1: Environment Setup

Start the development environment and prepare for observation.

```bash
# 1. Start dev server (product-specific)
cd products/<product>/apps/web
npm run dev

# 2. Launch browser for debugging
# If Playwright is available, use headless observation:
npx playwright open http://localhost:3100
```

**Checklist:**
- [ ] Dev server running without build errors
- [ ] Browser open to the affected page
- [ ] Browser DevTools console visible
- [ ] Network tab monitoring active

### Phase 2: Issue Analysis

Examine the reported issue and locate relevant code.

```
1. Read the bug report / issue description
2. Identify the affected page/route
3. Use Glob to find relevant component files:
   - Page component: app/**/page.tsx
   - Related components: components/**/<FeatureName>*
   - Hooks: hooks/use<Related>*
   - API calls: lib/api* or services/*
4. Read all identified files
5. Map the data flow: User Action → Event Handler → State Change → Re-render
```

**Output**: A written summary of:
- What the user expects to happen
- What actually happens
- The component tree involved
- The data flow path

### Phase 3: Hypothesis Formation

Form a specific, testable theory about the root cause.

```markdown
## Hypothesis #[N]

**Statement**: The bug is caused by [specific technical cause].

**Evidence that would CONFIRM this hypothesis**:
- [ ] [Observable symptom 1]
- [ ] [Console output pattern]
- [ ] [State value at specific point]

**Evidence that would REFUTE this hypothesis**:
- [ ] [Alternative symptom]
- [ ] [Different state value]

**Test plan**: [How to gather the evidence]
```

**Rules:**
- One hypothesis at a time
- Must be specific enough to be testable
- Must define what CONFIRMS and what REFUTES it
- If refuted, form a new hypothesis incorporating what you learned

### Phase 4: Instrumentation

Add diagnostic logging to trace execution. All diagnostic logs use the `[RCA]` prefix for easy filtering.

```typescript
// Add to the suspected component/hook
console.log('[RCA] ComponentName render', {
  props: { relevantProp1, relevantProp2 },
  state: { relevantState1 },
  timestamp: Date.now(),
});

// Add to event handlers
console.log('[RCA] handleClick called', {
  eventTarget: e.target,
  currentState: stateValue,
});

// Add to useEffect
useEffect(() => {
  console.log('[RCA] useEffect triggered', {
    dependency1,
    dependency2,
  });
}, [dependency1, dependency2]);

// Add to API calls
console.log('[RCA] API request', { url, params });
// ... after response
console.log('[RCA] API response', { status, data });
```

**Rules:**
- ONLY add `console.log` — do not modify any logic
- Prefix ALL diagnostic logs with `[RCA]`
- Log at decision points (before if/else, at function entry, at state changes)
- Include timestamps for ordering
- Keep instrumentation minimal and targeted

### Phase 5: Reproduction

Reproduce the issue while monitoring diagnostic output.

```
1. Clear the browser console
2. Navigate to the affected page
3. Execute the exact steps from the bug report
4. Capture ALL [RCA] console output
5. Note the exact sequence of logged events
6. Screenshot the visual state at each step
```

If the issue is intermittent:
- Try 3-5 reproduction attempts
- Note which attempts succeed/fail
- Look for timing-dependent patterns (race conditions)

### Phase 6: Log Analysis

Compare actual behavior against the hypothesis.

```markdown
## Log Analysis — Hypothesis #[N]

**Expected sequence** (if hypothesis is correct):
1. [RCA] ComponentA render with state X
2. [RCA] handleClick called
3. [RCA] setState to Y
4. [RCA] ComponentA re-render with state Y

**Actual sequence**:
1. [RCA] ComponentA render with state X
2. [RCA] handleClick called
3. [RCA] setState to Y
4. [RCA] ComponentA re-render with state X  ← UNEXPECTED

**Analysis**: State update is not persisting. The component re-renders
but with the old state value, suggesting [new insight].

**Hypothesis status**: REFUTED / CONFIRMED
```

### Phase 7: Decision Point

Based on analysis, take the appropriate path:

```
IF hypothesis CONFIRMED:
  → Proceed to Phase 8 (Fix Implementation)

IF hypothesis REFUTED:
  → Update understanding with new evidence
  → Return to Phase 3 with refined hypothesis
  → Maximum 3 iterations before escalating

IF inconclusive:
  → Add more instrumentation (Phase 4)
  → Try different reproduction steps (Phase 5)
```

### Phase 8: Fix Implementation

Apply a targeted fix based on the confirmed root cause.

```
1. Remove ALL [RCA] diagnostic logs
2. Implement the minimal fix for the confirmed root cause
3. Do NOT refactor surrounding code (separate concern)
4. Write a failing test that reproduces the bug FIRST (TDD)
5. Implement the fix
6. Verify the test passes
```

**Fix quality checklist:**
- [ ] Fix addresses the root cause, not a symptom
- [ ] No unrelated changes included
- [ ] [RCA] logs completely removed
- [ ] New test covers the exact bug scenario
- [ ] Existing tests still pass

### Phase 9: Verification

Confirm the fix resolves the issue completely.

```
1. Reproduce original steps — bug should NOT occur
2. Test edge cases around the fix
3. Run unit tests: npm test
4. Run E2E tests: npm run test:e2e
5. Visual verification in browser:
   - [ ] Original bug scenario works correctly
   - [ ] Related functionality unaffected
   - [ ] No new console errors
   - [ ] Responsive check (375px, 768px, 1024px)
```

### Phase 10: Documentation & Commit

Record the investigation and commit the fix.

```markdown
## RCA Summary

**Issue**: [Brief description]
**Root cause**: [Confirmed technical cause]
**Fix**: [What was changed and why]
**Evidence**: [Key log output that confirmed the hypothesis]
**Tests added**: [List of new tests]
**Iterations**: [How many hypotheses were tested]
```

**Commit message format:**
```
fix(<product>): <brief description of fix>

Root cause: <technical explanation>
Confirmed via RCA protocol with <N> hypothesis iterations.

Closes #<issue-number>
```

## Puppeteer/Playwright Tips for React Components

When automating reproduction with Playwright:

```typescript
// Standard selectors often fail with React/shadcn
// Use data-testid attributes (should already be on components)
await page.locator('[data-testid="submit-button"]').click();

// For shadcn Select/Dropdown (renders in portal)
await page.locator('[role="combobox"]').click();
await page.locator('[role="option"]').filter({ hasText: 'Option 1' }).click();

// For shadcn Dialog/Modal
await page.locator('[role="dialog"]').waitFor();

// Wait for React hydration before interacting
await page.waitForFunction(() => {
  return document.querySelector('[data-hydrated="true"]') !== null;
});

// Capture console logs programmatically
const consoleLogs: string[] = [];
page.on('console', msg => {
  if (msg.text().includes('[RCA]')) {
    consoleLogs.push(msg.text());
  }
});
```

## Error Recovery

| Problem | Solution |
|---------|----------|
| Dev server won't start | Check port conflicts (PORT-REGISTRY.md), clear `.next/` cache |
| Can't reproduce bug | Try different browsers, clear local storage, check for race conditions |
| Fix breaks other tests | Root cause hypothesis was incomplete — return to Phase 3 |
| 3+ hypothesis iterations with no progress | Escalate to Architect or pair with another engineer |

## Integration with ConnectSW Protocols

- **Quality Verification**: RCA findings must pass the 5-Step Verification Gate before marking complete
- **Proof Recording**: Save RCA Summary as a proof artifact in `docs/proofs/`
- **Regression Testing**: Every RCA fix MUST add a regression test (see `regression-testing.md`)
- **Direct Delivery**: Write RCA Summary to file, don't just report verbally
