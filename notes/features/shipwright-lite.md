# Shipwright Lite - Replace Bolt.diy with Lightweight SPA

## Branch: feature/shipwright/orchestrator-ui

## Goal
Replace heavy Bolt.diy (163 deps) with purpose-built Vite + React + Tailwind SPA + Fastify API.
Preserve the working orchestrator backend (6 files, ~600 lines).

## Ports
- Frontend: 3111
- Backend: 5007

## Key Decisions
- Single OpenRouter provider replaces 19 LLM provider files
- SSE streaming with 0:/2:/8: format for text/progress/usage
- No auth (stateless internal tool)
- Vitest for testing (matching existing orchestrator tests)

## Progress
- [x] Step 1: Project scaffold (27 orchestrator tests passing)
- [x] Step 2: OpenRouter model factory (4 tests)
- [x] Step 3: SSE stream writer (5 tests)
- [x] Step 4: Backend routes + server (5 tests)
- [x] Step 5: Frontend SSE parser (6 tests)
- [x] Step 6: Frontend artifact parser (6 tests)
- [x] Step 7: Frontend ZIP export (4 tests)
- [x] Step 8: useOrchestrator hook (6 tests)
- [x] Step 9: Chat components (8 tests)
- [x] Step 10: Pipeline sidebar (7 tests)
- [x] Step 11: File viewer (8 tests)
- [x] Step 12: App layout + integration (86 total tests)
- [x] Step 13: Cleanup + PR

## Test Summary
- API: 41 tests (6 test files)
- Web: 45 tests (7 test files)
- Total: 86 tests, all passing
