# ADR-001: Technology Stack Decisions

**Date**: 2026-02-15
**Status**: Accepted
**Deciders**: ConnectSW Engineering Team

## Context

LinkedIn Agent is a new product that generates AI-powered LinkedIn content in Arabic and English. We need to make foundational technology decisions covering AI provider integration, language strategy, data ingestion approach, and application framework choices.

This ADR documents four key decisions made together as they are interconnected.

---

## Decision 1: OpenRouter over Direct API Calls

### Context

LinkedIn Agent needs to use multiple AI models for different tasks -- Claude for Arabic writing, Gemini for trend analysis, GPT-4o-mini for quick edits. We could either integrate directly with each provider's API or use an aggregator service.

### Options Considered

**Option A: Direct API integration with each provider**
- Pros: No middleware dependency, full control over each SDK, potentially lower latency
- Cons: 3+ separate API keys, 3+ SDKs to maintain, 3+ billing accounts, different error formats, no unified fallback logic

**Option B: OpenRouter as unified API gateway**
- Pros: Single API key, unified request/response format, built-in model fallback, single billing, easy model switching, cost transparency, access to 100+ models through one integration
- Cons: Additional dependency, slightly higher latency (~50ms), markup on token pricing

**Option C: LiteLLM (self-hosted proxy)**
- Pros: Self-hosted, no markup, open source
- Cons: Additional infrastructure to manage, maintenance burden, less reliable than managed service

### Decision

**Option B: OpenRouter**

### Rationale

1. **Development speed**: One integration instead of three. The unified API format means our model routing logic is a configuration change, not a code change.
2. **Cost optimization**: OpenRouter's dashboard provides per-model cost tracking out of the box. We can see exactly what each task costs and optimize routing.
3. **Model flexibility**: When a better Arabic model appears (and the Arabic AI space is evolving rapidly), we can switch by changing a model ID string. No SDK updates, no new API integrations.
4. **Fallback handling**: If Claude is down, OpenRouter can automatically fall back to an alternative model. We get reliability without building our own fallback chain.
5. **The markup is acceptable**: OpenRouter's markup is minimal relative to the operational cost of maintaining three separate integrations. For an MVP, speed matters more than saving fractions of a cent per token.

### Consequences

- We depend on OpenRouter's uptime and pricing stability
- We should abstract our OpenRouter calls behind a service layer so we can swap providers if needed
- We need to handle OpenRouter-specific error codes

---

## Decision 2: Arabic-First Approach

### Context

Most AI content tools are English-first with Arabic as an afterthought (if supported at all). We need to decide our language prioritization strategy.

### Options Considered

**Option A: English-first, Arabic as translation**
- Pros: Simpler development, more AI model options, larger initial market
- Cons: Arabic quality suffers, translations feel unnatural, doesn't solve the core problem

**Option B: Arabic-first, English as secondary**
- Pros: Addresses underserved market, higher quality Arabic output, clear differentiation, RTL-native UI
- Cons: Smaller initial market, harder to test quality (team needs Arabic expertise), fewer benchmark datasets

**Option C: Fully bilingual (equal priority)**
- Pros: Broader market from day one
- Cons: Doubles QA effort, unclear product positioning, neither language gets full attention

### Decision

**Option B: Arabic-first**

### Rationale

1. **Underserved market**: There are dozens of English LinkedIn content tools (Taplio, AuthoredUp, Kleo). There are zero quality Arabic-focused tools. This is our competitive advantage.
2. **RTL-native UI**: Building RTL from the start is far easier than retrofitting. An Arabic-first approach forces us to get RTL right in the initial architecture.
3. **Quality differentiation**: AI-generated Arabic is noticeably worse than AI-generated English across all models. By focusing on Arabic, we can invest in prompt engineering, fine-tuning, and quality scoring specifically for Arabic output. This becomes our moat.
4. **Market demand**: The Arab tech ecosystem is growing rapidly (Saudi Vision 2030, UAE tech expansion). There is a growing class of Arabic-speaking professionals who want to build LinkedIn presence in their native language.
5. **English support is still included**: Arabic-first does not mean Arabic-only. English generation and translation are core features. But Arabic quality is the bar we optimize for.

### Consequences

- UI must be RTL-native from day one (Next.js has good RTL support via Tailwind's `rtl:` variant)
- We need Arabic-fluent QA for content quality testing
- Prompt engineering must be optimized for Arabic output quality
- Marketing should target Arabic-speaking tech communities first

---

## Decision 3: Manual Paste over LinkedIn API (Phase 1)

### Context

Users need to get content into LinkedIn. We could integrate with LinkedIn's API for direct posting, or have users copy-paste generated content.

### Options Considered

**Option A: LinkedIn API integration from day one**
- Pros: Seamless UX, direct posting, analytics access
- Cons: OAuth complexity, LinkedIn API approval process (weeks/months), rate limits, API instability, scope restrictions, compliance requirements

**Option B: Manual copy-paste workflow**
- Pros: Zero external dependencies, instant launch, no API approval needed, works with any LinkedIn account, no OAuth to maintain
- Cons: Extra step for users (copy-paste), no direct analytics, can't schedule posts

**Option C: Chrome extension for in-page injection**
- Pros: Semi-seamless UX, no API approval needed
- Cons: Chrome-only, extension store review process, fragile DOM selectors, maintenance burden when LinkedIn changes UI

### Decision

**Option B: Manual copy-paste for Phase 1**, with LinkedIn API integration planned for Phase 3.

### Rationale

1. **Speed to market**: LinkedIn API integration requires creating a LinkedIn Developer app, getting approval for the `w_member_social` scope (which requires a company page and review), implementing OAuth 2.0 flow, and handling token refresh. This adds 2-4 weeks to MVP launch.
2. **Reduced risk**: LinkedIn's API has historically been unreliable and restrictive. They frequently change scopes, deprecate endpoints, and tighten rate limits. Building core value on a dependency we don't control is risky for an MVP.
3. **Validation first**: Before investing in API integration, we need to validate that users actually want AI-generated Arabic LinkedIn content. Copy-paste is a minor friction point -- if the content quality is good enough, users will happily copy-paste.
4. **The copy-paste UX is solvable**: One-click copy to clipboard, formatted preview, character count -- we can make the copy-paste experience smooth enough that it doesn't feel like a limitation.

### Consequences

- We need a polished copy-to-clipboard experience (one click, formatted correctly)
- Post status tracking is manual (user marks as "published")
- No built-in analytics until Phase 3
- Phase 3 will require LinkedIn Developer approval and OAuth implementation

---

## Decision 4: Fastify + Next.js (ConnectSW Standard Stack)

### Context

We need to choose application frameworks for the backend API and frontend.

### Options Considered

**Option A: Fastify + Next.js (ConnectSW standard)**
- Pros: Consistent with all other ConnectSW products, shared knowledge, reusable components from COMPONENT-REGISTRY, proven patterns, team familiarity
- Cons: None significant -- this stack is well-proven for our use cases

**Option B: Express + Remix**
- Pros: Express has larger ecosystem, Remix has good SSR patterns
- Cons: Deviates from company standard, can't reuse existing components, different patterns to maintain

**Option C: tRPC + Next.js (full-stack Next.js)**
- Pros: End-to-end type safety, fewer moving parts
- Cons: Tight coupling, harder to scale independently, deviates from company patterns

**Option D: Python (FastAPI) + Next.js**
- Pros: Python has better AI/ML libraries
- Cons: Different language from rest of company, can't share code, new tooling

### Decision

**Option A: Fastify + Next.js**

### Rationale

1. **Consistency**: Every ConnectSW product uses Fastify + Next.js. Consistency reduces cognitive load, enables code reuse, and means any agent can work on any product.
2. **Component reuse**: The COMPONENT-REGISTRY has 25+ production-tested components (auth plugins, error handling, API patterns, UI components) that we can copy directly.
3. **Prisma ORM**: Already used across all products. Schema patterns, migration workflows, and testing approaches are well-established.
4. **AI integration doesn't need Python**: We're calling AI models via HTTP (OpenRouter API). There's no need for Python ML libraries. TypeScript with `fetch` is perfectly sufficient.
5. **Fastify performance**: Fastify is faster than Express and has a better plugin architecture. For an AI-heavy product where API response times include AI model latency, the framework overhead is negligible -- but the plugin system helps organize code well.

### Consequences

- Can immediately leverage ConnectSW shared patterns and components
- New engineers (or agents) familiar with other ConnectSW products can contribute immediately
- Frontend uses Next.js 15 (latest) with App Router
- Backend uses Fastify 5 with TypeScript
- Database access via Prisma with PostgreSQL

---

## Summary of Decisions

| Decision | Choice | Key Reason |
|----------|--------|------------|
| AI Provider | OpenRouter | Model flexibility, single integration |
| Language Strategy | Arabic-first | Underserved market, competitive moat |
| Content Ingestion | Manual paste (Phase 1) | Speed to market, reduced risk |
| App Framework | Fastify + Next.js | ConnectSW consistency, component reuse |
