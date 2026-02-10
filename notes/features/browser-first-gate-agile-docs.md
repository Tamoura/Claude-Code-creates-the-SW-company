# Browser-First Gate + Agile Documentation System

## Summary

Two enhancements to ConnectSW's orchestrator and quality system:

### Part 1: Browser-First Test Gate

**Problem**: Products pass unit tests but don't work in browsers. Smoke test was Phase 6 (last).

**Solution**: Made browser verification Phase 1 with hard early exit (`exit 1`). If the app doesn't work in a browser, no other phases run.

**Files Modified**:
- `.claude/scripts/testing-gate-checklist.sh` — Restructured phases (browser=1, prereqs=2, unit=3, e2e=4, quality=5, coverage=6). Removed old Phase 6 smoke test (redundant).
- `.claude/scripts/smoke-test-gate.sh` — Auto-installs Playwright if missing, checks `/login` and `/dashboard` routes, detects hydration errors.
- `.claude/orchestrator/orchestrator-enhanced.md` — Step 4.F now explicitly blocks on browser gate before testing/audit gates.
- `.claude/quality-gates/multi-gate-system.md` — Added Browser-First Gate (Gate 0) as foundational gate.

### Part 2: Agile Documentation System

**Problem**: No structured agile traceability (Epic/Feature/Story/Task hierarchy).

**Solution**: YAML-based backlog system with CLI management and GitHub sync.

**Files Created**:
- `.claude/workflows/templates/backlog-template.yml` — Starter template for new product backlogs
- `.claude/scripts/manage-backlog.sh` — CLI: `init`, `sprint`, `board`, `add-story`, `add-bug`, `update`, `velocity`, `summary`
- `.claude/scripts/sync-backlog-to-github.sh` — Syncs backlog.yml to GitHub Issues with labels (epic, feature, story, bug)

**Orchestrator Integration**:
- Step 3.3: Auto-generates backlog from task graph
- Step 4.E: Updates backlog status when agents complete tasks
- Step 5: CEO reports include sprint progress + velocity

## Phase Order (Testing Gate)

1. Browser Verification (BLOCKING)
2. Prerequisites
3. Unit Tests
4. E2E Tests (MANDATORY)
5. Code Quality
6. Coverage

## Gate Order (Multi-Gate System)

0. Browser-First Gate (foundational)
1. Security Gate
2. Performance Gate
3. Testing Gate
4. Production Readiness Gate
