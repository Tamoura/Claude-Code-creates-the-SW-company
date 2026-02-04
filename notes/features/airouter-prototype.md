# AIRouter Prototype - Development Notes

## Date Started: 2026-02-04

## Concept
Free AI API Router - BYOK developer tool for discovering, managing, and routing between free AI API providers.

## Legal Approach
- BYOK only (users own their keys)
- No shared keys
- No ToS violations
- Guided acquisition only

## Ports
- API: 5006
- Web: 3110

## Key Providers (Top 5 by free tier generosity)
1. Google Gemini - 100-1,000 RPD, Gemini 2.5 Pro/Flash
2. Groq - ~1,000 RPD, Llama models, 300+ tok/sec
3. Cerebras - 1M tokens/day, Llama/Qwen/DeepSeek
4. SambaNova - Unlimited (rate-limited), Llama 3.1-3.3
5. Cloudflare Workers AI - 10K Neurons/day, 50+ models

## Reused Components
- Auth plugin (stablecoin-gateway)
- Redis plugin (stablecoin-gateway)
- Prisma plugin (stablecoin-gateway)
- Observability plugin (stablecoin-gateway)
- Crypto utils (stablecoin-gateway)
- Encryption utils (stablecoin-gateway)
- Logger (stablecoin-gateway)
- Redis rate limit store (stablecoin-gateway)
- Error classes (invoiceforge)
- Frontend: TokenManager, useAuth, useTheme, ErrorBoundary, ProtectedRoute, StatCard

## Progress
- [ ] Foundation (branch, dirs, concept)
- [ ] Backend API prototype
- [ ] Frontend dashboard
- [ ] Tests passing
- [ ] PR created
