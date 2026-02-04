# Shipwright Foundation

## Status: Step 2 Complete (Auth + Database)

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

## Completed Steps

1. Fork Bolt.diy — 515 files imported
2. Port registered (3110), state updated
3. Clerk auth — `@clerk/remix`, route protection, sign-in/sign-up routes
4. Prisma + PostgreSQL — User, Project, AgentRun models, user sync service

## Tests: 61/61 passing

- 52 original Bolt.diy tests (Markdown parsing, etc.)
- 5 auth route protection tests
- 4 user-sync tests

## Commits on branch

```
1665a5a feat(shipwright): add Prisma schema and user sync service
f6e9516 feat(shipwright): add Clerk auth with route protection
970d424 chore(shipwright): register port, update state, add notes
ff84df5 feat(shipwright): fork Bolt.diy as product foundation
74e1568 docs(shipwright): add hybrid agentic framework strategy
```

## Technical Notes

- Prisma 7 config: `url` no longer in schema, moved to `prisma.config.ts`
- `@clerk/remix` is in maintenance mode; may need to migrate to React Router SDK
- Cloudflare adapter: Clerk needs explicit `secretKey` via `args.context.cloudflare.env`
- Prisma works in dev (`vite dev` runs Node.js) but won't work on Cloudflare Workers
- Runtime switch to Node.js needed before deployment (Railway/Fly.io target)

## Next Steps

1. Step 3: Add Neon PostgreSQL + run migrations (needs DATABASE_URL)
2. Step 4: Define Agent/WorkflowEngine/Orchestrator interfaces
3. Step 5: Build multi-agent orchestrator
4. Step 6: Replace Bolt.diy's single LLM call with orchestrator pipeline
