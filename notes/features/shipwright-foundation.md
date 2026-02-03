# Shipwright Foundation

## Status: Fork Complete

Bolt.diy (stackblitz-labs/bolt.diy, MIT) forked into `products/shipwright/`.
Branch: `feature/shipwright/dev`

## CEO Decisions

- **Agentic framework**: Hybrid — homegrown TypeScript orchestrator for MVP, abstraction interfaces for future swap to LangChain.js/CrewAI
- **Concept**: Approved — Fork Bolt.diy + multi-agent orchestration + Clerk auth + Stripe billing
- **Implementation order**: Per PLAN.md (11 steps)

## Bolt.diy Codebase Key Findings

### Critical Integration Points

| File | What | Line |
|------|------|------|
| `app/routes/api.chat.ts` | Main LLM API endpoint | ~310 (streamText call) |
| `app/lib/.server/llm/stream-text.ts` | Wraps Vercel AI SDK | ~310 |
| `app/lib/common/prompts/prompts.ts` | System prompt (700+ lines) | Full file |
| `app/lib/runtime/message-parser.ts` | Parses `<boltArtifact>` tags from LLM output | Full file |
| `app/lib/runtime/action-runner.ts` | Executes file/shell/start actions | Full file |
| `app/components/chat/Chat.client.tsx` | Chat UI, uses `useChat()` from `@ai-sdk/react` | ~134, ~389 |
| `app/lib/stores/workbench.ts` | Main state store (nanostores) | Full file |

### Architecture

- **Framework**: Remix + React (not Next.js — important for routing)
- **AI SDK**: Vercel AI SDK (`@ai-sdk/react`, `ai` package) — `streamText()` and `useChat()`
- **Code execution**: WebContainer (in-browser Node.js via WASM) — no Docker needed for dev
- **State**: Nanostores (not React context or Redux)
- **Editor**: CodeMirror (via `@codemirror/*`)
- **Terminal**: xterm.js

### LLM Output Format (MUST PRESERVE)

All agent outputs must use this XML format or the UI breaks:

```xml
<boltArtifact id="unique-id" title="Feature Name">
  <boltAction type="file" filePath="/src/App.tsx">
    [CODE CONTENT]
  </boltAction>
  <boltAction type="shell">
    npm install package-name
  </boltAction>
  <boltAction type="start">
    npm run dev
  </boltAction>
</boltArtifact>
```

### Orchestrator Integration Strategy

Best approach: intercept at `api.chat.ts` (API route level). Create `api.orchestrator.ts` that:
1. Analyzes user request intent
2. Routes to specialist agent (different system prompt)
3. Coordinates multi-agent handoffs
4. Ensures output conforms to `<boltArtifact>` format
5. Streams back to existing UI

Point the chat component's `api` prop from `/api/chat` to `/api/orchestrator`.

### Dev Server

- Default port: 5173 (need to change to 3110+ per port registry)
- Build: `pnpm run build` — succeeds
- Dev: `pnpm run dev` — starts correctly

## Next Steps

1. Register port in PORT-REGISTRY.md
2. Add Shipwright to orchestrator state.yml
3. Begin Step 2: Clerk auth integration
