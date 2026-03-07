# OpenRouter Integration for AI Fluency Assessments

## Goal
Integrate OpenRouter's free AI models to power AI-enhanced assessment capabilities in the AI Fluency platform.

## What OpenRouter Adds
1. **AI-Evaluated Free-Text Responses** - Learners write open-ended responses to scenarios; AI evaluates against behavioral indicators
2. **Dynamic Feedback Generation** - AI provides personalized, dimension-specific feedback after assessment completion
3. **Learning Path Recommendations** - AI generates tailored learning recommendations based on fluency profile

## Architecture Decisions
- OpenRouter client as a Fastify plugin (consistent with existing plugin pattern)
- `OPENROUTER_API_KEY` added to config.ts env validation (optional - graceful degradation)
- Free models: `meta-llama/llama-3.1-8b-instruct:free`, `google/gemma-2-9b-it:free`
- Fallback: if OpenRouter is unavailable, assessment still works with static scoring
- All AI calls are non-blocking for the core assessment flow

## Files Changed
- `src/config.ts` - Add OPENROUTER_API_KEY, OPENROUTER_MODEL env vars
- `src/services/openrouter.ts` - OpenRouter API client
- `src/services/ai-evaluator.ts` - AI-powered response evaluation
- `src/services/ai-feedback.ts` - Post-assessment feedback generation
- `tests/unit/openrouter.test.ts` - Client tests
- `tests/unit/ai-evaluator.test.ts` - Evaluator tests
- `tests/unit/ai-feedback.test.ts` - Feedback generation tests
- `package.json` - No new deps needed (uses native fetch)

## OpenRouter API
- Base URL: https://openrouter.ai/api/v1
- Endpoint: POST /chat/completions (OpenAI-compatible)
- Auth: Bearer token via `Authorization` header
- Free models have rate limits but no cost
