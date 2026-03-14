# IMPL-028/029/032/033/034 — LangGraph Agent + CopilotKit Runtime

## Tasks
- IMPL-028: Agent unit tests (state, router, synthesizer)
- IMPL-029: Agent tool tests (RAG search)
- IMPL-032: Agent state, router node, synthesizer node, graph orchestration
- IMPL-033: RAG search tool wrapping rag-query.service
- IMPL-034: CopilotKit runtime endpoint (POST /api/v1/copilot/run)

## Key Decisions
- No actual LangGraph library -- simple state machine pattern
- LLM calls are injected as dependency (mockable for tests)
- AI disclaimer: "This response is AI-generated and should not be considered professional advice."
- Rate limit: 20 req/min for copilot endpoint
- All deps injected via createAdvisoryAgent(deps) factory

## File Structure
```
src/agent/
  state.ts           -- AgentState interface, Citation/ToolResult types
  nodes/router.ts    -- classifies query intent by keywords
  nodes/synthesizer.ts -- builds response with org context + citations
  tools/rag-search.ts -- wraps RAGQueryService
  graph.ts           -- state machine orchestrating router -> tool -> synthesizer
src/routes/copilot.ts  -- POST /api/v1/copilot/run
src/services/copilot.service.ts -- orchestrates agent invocation
```

## Patterns Used
- Dependency injection for testability (LLM provider, RAG service)
- sendSuccess/sendError from lib/response.ts for consistent API responses
- preHandler: [fastify.authenticate] for auth
- Per-route rate limiting via @fastify/rate-limit config option
