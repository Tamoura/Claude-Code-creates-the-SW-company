# AI Risk Scoring via OpenRouter

## Branch
`feature/pulse/ai-risk-scoring`

## Summary
Integrate real AI-generated analysis into Pulse's sprint risk engine using
OpenRouter as the LLM gateway. The 7 weighted risk factors stay rule-based.
AI generates the narrative explanation + actionable recommendations.

## Key Decisions
- OpenRouter chosen as LLM gateway (model-agnostic, single API)
- Default model: `anthropic/claude-sonnet-4-20250514`
- Graceful degradation: no API key or API failure → template fallback
- No new npm dependencies — fetch-based client
- `recommendations` field already exists in Prisma schema (always null until now)

## Files Changed
- `apps/api/src/config.ts` — add openrouterApiKey + openrouterModel
- `apps/api/.env` — add OPENROUTER_API_KEY + OPENROUTER_MODEL
- `apps/api/src/utils/ai-client.ts` — new fetch-based OpenRouter client
- `apps/api/src/modules/risk/service.ts` — AI explanation + fallback
- `apps/api/src/modules/risk/schemas.ts` — add recommendations to RiskResult
- `apps/web/src/app/dashboard/risk/page.tsx` — wire to real API
- `apps/api/tests/risk/ai-explanation.test.ts` — unit tests
- `docs/ADRs/ADR-003-sprint-risk-scoring.md` — add hybrid AI section
