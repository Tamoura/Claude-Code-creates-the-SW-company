# AIRouter - Free AI API Router for Developers

## One-Line Pitch

A developer tool that helps you discover, acquire, and intelligently route between free AI API providers -- maximizing your free capacity with zero cost.

## Problem

- 15+ providers offer free AI API tiers (Gemini, Groq, Cerebras, SambaNova, etc.)
- No single tool helps developers discover, manage, and route between them
- Each provider has different rate limits, models, and API formats
- Beginners don't know where to start getting free API access
- Existing gateways (LiteLLM, OpenRouter, Portkey) focus on paid production workloads

## Solution

AIRouter is a **BYOK (Bring Your Own Key)** developer tool that:

1. **Discovers** free AI API providers with live status and limit tracking
2. **Guides** users through acquiring free API keys from each provider
3. **Stores** user's provider keys securely (AES-256-GCM encrypted)
4. **Routes** requests intelligently across user's free-tier keys
5. **Fails over** automatically when one provider is rate-limited or down
6. **Tracks** free tier usage to maximize available capacity

## Legal Approach (Safe-Only)

- **BYOK only** -- users provide and own their API keys
- **No shared keys** -- we never proxy with our own provider keys
- **No multi-account aggregation** -- one account per user per provider
- **Guided acquisition** -- tutorials and links, users create their own accounts
- All provider ToS respected

## Key Features (Prototype)

### Provider Directory
- List of 15+ free AI API providers
- Current free tier limits and rate limits
- Model availability per provider
- Live health/status monitoring
- Step-by-step key acquisition guides

### Key Vault (BYOK)
- Securely store provider API keys (AES-256-GCM at rest)
- Test key validity on import
- Track per-key usage against free tier limits
- Automatic key rotation reminders

### Smart Router
- OpenAI-compatible API endpoint (`/v1/chat/completions`)
- Routes to best available free provider based on:
  - Remaining free tier quota
  - Current provider health/latency
  - Model capability match
  - User preference/priority
- Automatic failover when a provider returns 429 (rate limited)

### Usage Dashboard
- Aggregated view of free tier usage across all providers
- Remaining capacity calculator
- Request history and latency metrics
- Provider health status

## Target Users

- Coding bootcamp students
- Indie hackers / hobbyist developers
- Developers in emerging markets (credit card barriers)
- AI educators running workshops
- Open-source maintainers needing AI for CI/CD

## Tech Stack

- **Backend**: Fastify + TypeScript + Prisma + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS
- **Ports**: API 5006, Web 3110
- **Key encryption**: AES-256-GCM
- **Rate tracking**: Redis

## Non-Goals (Prototype)

- Shared/community API keys
- Production SLA guarantees
- Billing/payment processing
- Self-hosting support
