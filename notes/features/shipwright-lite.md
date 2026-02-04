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
- [ ] Step 1: Project scaffold
- [ ] Step 2: OpenRouter model factory
- [ ] Step 3: SSE stream writer
- [ ] Step 4: Backend routes + server
- [ ] Step 5: Frontend SSE parser
- [ ] Step 6: Frontend artifact parser
- [ ] Step 7: Frontend ZIP export
- [ ] Step 8: useOrchestrator hook
- [ ] Step 9: Chat components
- [ ] Step 10: Pipeline sidebar
- [ ] Step 11: File viewer
- [ ] Step 12: App layout + integration
- [ ] Step 13: Cleanup + PR
