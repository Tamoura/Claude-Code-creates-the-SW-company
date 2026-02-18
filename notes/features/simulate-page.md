# Simulate Page Feature Notes

## Summary
New `/simulate` page in Command Center that visualizes the full new-product creation workflow — phases, agents, deliverables, checkpoints, and timeline.

## Key Decisions
- Data source: `.claude/workflows/templates/new-product-tasks.yml` (9 tasks, 4 phases)
- Uses `yaml` npm package for full-fidelity YAML parsing (not regex)
- Critical path algorithm: topological sort + earliest-start scheduling
- Reuses existing Workflows.tsx patterns (StatCard, Badge, MarkdownRenderer, agentColorMap)

## Files Created
- `apps/api/src/services/simulations.service.ts` — YAML parser + critical path + Gantt
- `apps/api/src/routes/v1/simulations.ts` — GET /api/v1/simulations/new-product
- `apps/web/src/pages/Simulate.tsx` — Frontend page

## Files Modified
- `apps/api/src/app.ts` — Register simulation routes
- `apps/web/src/App.tsx` — Add /simulate route
- `apps/web/src/components/Layout.tsx` — Add nav item under Portfolio

## Expected Numbers
- 4 phases, 9 tasks, 6 unique agents, 3 checkpoints
- Sequential: ~900 min (~15h), Parallel: ~525 min (~8.75h), Savings: ~42%
