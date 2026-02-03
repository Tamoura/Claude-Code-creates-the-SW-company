# Plan: 0-to-1 SaaS — "Shipwright" (AI Dev Team as a Service)

## Strategy: Build on Open Source, Not From Scratch

Instead of building everything custom, we fork an existing open-source AI app builder and add our multi-agent orchestration layer on top.

---

## Open-Source Options Evaluated

| Project | Stars | What It Gives Us | Gap |
|---------|-------|-------------------|-----|
| **[Bolt.diy](https://github.com/stackblitz-labs/bolt.diy)** | 15K+ | Full UI (chat, code viewer, file tree, deploy), Docker support, multi-LLM, TypeScript/React | Single-agent only, no multi-agent orchestration, no billing |
| **[MetaGPT](https://github.com/FoundationAgents/MetaGPT)** | 63K+ | Multi-agent "AI software company" concept identical to ours (PM, Architect, Engineers), SOP workflows | Python only, no web UI, no SaaS layer, no billing |
| **[OpenHands](https://github.com/OpenHands/OpenHands)** | 50K+ | Production-grade code execution sandbox, Docker isolation, git ops, SDK, CLI, already has SaaS tier | Python backend, complex architecture, their own SaaS competes with us |
| **[CrewAI](https://www.crewai.com/)** | 25K+ | Best multi-agent orchestration framework, role-based teams, visual studio | Python, framework not platform, no code execution sandbox |

### Recommendation: **Fork Bolt.diy**

**Why Bolt.diy wins for 0-to-1:**

1. Already has the **complete UX** customers expect (chat prompt -> AI writes code -> live preview -> deploy)
2. **TypeScript/React** — matches our existing ConnectSW stack, so our agents already know these patterns
3. Already handles the hard parts: **WebContainer/Docker code execution, file tree UI, code editor, deployment to Netlify/Vercel**
4. MIT-licensed, actively maintained, large community
5. We only need to add: **multi-agent layer + billing + auth**
6. Supports **Anthropic Claude** out of the box via Vercel AI SDK

**What we replace/add:**
- Replace Bolt.diy's single-agent prompt with our **Orchestrator + specialist agents**
- Add a **sidebar showing agent team activity** (PM designing, Architect planning, Backend coding, etc.)
- Add **Clerk auth + Stripe billing**
- Add our **task graph visualization** (so users see the plan, not just chat)

---

## 0-to-1 Scope (MVP)

### What MVP Does

A customer:
1. Signs up (Clerk auth)
2. Types "Build me a task management app with user authentication"
3. Watches as the **agent team** works:
   - Product Manager creates the plan
   - Architect designs the structure
   - Backend Engineer builds the API
   - Frontend Engineer builds the UI
   - QA Engineer runs tests
4. Sees code appear in real-time (Bolt.diy's existing code editor)
5. Gets a live preview (Bolt.diy's existing preview)
6. Downloads or deploys
7. Pays $49/mo for continued access

### What MVP Does NOT Do

- No white-label
- No external GitHub integration
- No custom domains
- No team collaboration
- No Firecracker VMs (use Bolt.diy's existing Docker/WebContainer)
- No enterprise SSO
- No marketplace
- No advanced quality gates (just basic test running)

---

## Architecture (Keep It Simple)

```
Bolt.diy Fork (Remix app)
├── Frontend (existing Bolt.diy UI)
│   ├── Chat interface (existing)
│   ├── Code editor + file tree (existing)
│   ├── Live preview (existing)
│   ├── NEW: Agent team sidebar (shows which agents are active)
│   ├── NEW: Task graph view (shows the plan)
│   └── NEW: Billing page
│
├── Backend (extend Bolt.diy's server)
│   ├── LLM integration (existing, uses Vercel AI SDK)
│   ├── File system / Docker (existing)
│   ├── NEW: Multi-agent orchestrator
│   │   ├── Ported from .claude/orchestrator/orchestrator-enhanced.md
│   │   ├── Routes user request → workflow → agents
│   │   └── Manages agent sequence (PM → Arch → Backend → Frontend → QA)
│   ├── NEW: Agent definitions (ported from .claude/agents/*.md)
│   ├── NEW: Task graph engine (ported from .claude/engine/task-graph-executor.ts)
│   ├── NEW: Auth middleware (Clerk)
│   └── NEW: Billing (Stripe)
│
└── Database (NEW: add PostgreSQL via Neon)
    ├── Users + Organizations
    ├── Projects
    ├── Agent messages / history
    ├── Usage records
    └── Subscriptions
```

### What We Port From ConnectSW

| ConnectSW Asset | MVP Use |
|-----------------|---------|
| `.claude/agents/product-manager.md` | System prompt for PM agent |
| `.claude/agents/architect.md` | System prompt for Architect agent |
| `.claude/agents/backend-engineer.md` | System prompt for Backend agent |
| `.claude/agents/frontend-engineer.md` | System prompt for Frontend agent |
| `.claude/agents/qa-engineer.md` | System prompt for QA agent |
| `.claude/orchestrator/orchestrator-enhanced.md` | Business logic for routing requests to agents |
| `.claude/engine/task-graph-executor.ts` | Task/dependency management (TypeScript, direct port) |
| `.claude/workflows/templates/new-product-tasks.yml` | Default workflow for "build me an app" |

### What Bolt.diy Already Provides

- Remix-based web app with chat UI
- Monaco code editor with file tree
- WebContainer (in-browser Node.js) or Docker for code execution
- Vercel AI SDK integration (supports Claude, GPT, Gemini, etc.)
- Deploy to Netlify/Vercel/GitHub Pages
- Download as ZIP
- Git import/export
- Image attachment for prompts
- Code revert/versioning

---

## Agentic Framework Strategy

**Decision**: Hybrid approach — homegrown TypeScript orchestrator for MVP, clean abstraction layer for future framework swap.

**Rationale**: The task-graph-executor.ts and Vercel AI SDK already in Bolt.diy give us everything needed for MVP. Building on a framework like LangChain.js or CrewAI adds dependency weight and learning curve with no immediate payoff. But we design the interfaces so swapping is a config change, not a rewrite.

### Key Interfaces

```typescript
// Agent — wraps a single specialist (PM, Architect, Backend, etc.)
interface Agent {
  readonly role: string;
  execute(task: Task, context: AgentContext): Promise<AgentResult>;
  stream(task: Task, context: AgentContext): AsyncIterable<StreamChunk>;
  handoff(toAgent: string, payload: HandoffPayload): Promise<void>;
}

// WorkflowEngine — manages the task dependency graph
interface WorkflowEngine {
  loadGraph(template: string, vars: Record<string, string>): TaskGraph;
  getReadyTasks(graph: TaskGraph): Task[];
  markComplete(graph: TaskGraph, taskId: string, result: AgentResult): void;
  getStatus(graph: TaskGraph): GraphStatus;
}

// Orchestrator — top-level coordinator
interface Orchestrator {
  handleRequest(prompt: string, projectId: string): AsyncIterable<OrchestratorEvent>;
  selectWorkflow(prompt: string): string;
  routeTask(task: Task): Agent;
}
```

### MVP Implementation

Each interface gets a concrete class that calls Claude directly via Vercel AI SDK:

- `ClaudeAgent` implements `Agent` — wraps `generateText()` / `streamText()` with the agent's system prompt from `.claude/agents/*.md`
- `TaskGraphWorkflowEngine` implements `WorkflowEngine` — ports `task-graph-executor.ts` directly
- `SimpleOrchestrator` implements `Orchestrator` — sequential pipeline (PM -> Architect -> Backend -> Frontend -> QA)

No framework dependencies. Just TypeScript + Vercel AI SDK + our agent definitions.

### Future Swap Path

When we need capabilities beyond direct API calls, swap the implementation behind the same interfaces:

| Trigger | Swap To | What Changes |
|---------|---------|--------------|
| Complex tool chains (10+ tools per agent) | LangChain.js agents | `ClaudeAgent` → `LangChainAgent` |
| Persistent memory across sessions | LangGraph checkpointing | `TaskGraphWorkflowEngine` → `LangGraphWorkflowEngine` |
| RAG retrieval over project history | LangChain.js retrieval | Add retrieval step inside `AgentContext` |
| Visual workflow builder for non-devs | CrewAI-style YAML crews | `SimpleOrchestrator` → `CrewOrchestrator` |

The swap is at the implementation level. Nothing above the interfaces changes — UI, billing, auth, database all stay the same.

---

## Implementation Steps

### Step 1: Fork and Run Bolt.diy

```bash
git clone https://github.com/stackblitz-labs/bolt.diy.git products/shipwright
cd products/shipwright
pnpm install
# Configure ANTHROPIC_API_KEY
pnpm run dev  # runs on port 5173
```

Verify it works: open browser, prompt it to build something, see code generated.

### Step 2: Add Auth (Clerk)

- Install `@clerk/remix`
- Wrap the app with ClerkProvider
- Add sign-up/sign-in pages
- Protect the main app route (must be logged in)
- Store user info in a new PostgreSQL database (Neon)

### Step 3: Add Multi-Agent Orchestrator

This is the core differentiation. Replace Bolt.diy's single LLM call with our agent pipeline:

```typescript
// When user submits a prompt like "Build me a task management app":

// 1. Orchestrator receives the request
const orchestrator = new OrchestratorService();
const workflow = orchestrator.selectWorkflow(userPrompt); // → "new-product"

// 2. Load task graph from template
const graph = TaskGraphEngine.fromTemplate('new-product-tasks.yml', {
  product: userPrompt,
  techStack: 'react-node'
});

// 3. Execute agents in sequence
for (const task of graph.getReadyTasks()) {
  const agent = AgentFactory.create(task.agentType); // e.g., 'product-manager'
  const result = await agent.execute(task, {
    systemPrompt: loadAgentDefinition(task.agentType), // from .claude/agents/*.md
    model: selectModel(task), // haiku for PM, sonnet for engineers
    stream: true, // stream to UI
    onToken: (token) => broadcastToClient(projectId, task.agentType, token)
  });
  graph.markComplete(task.id, result);
}
```

The key insight: each "agent" is just a Claude API call with a different system prompt. The orchestrator manages the sequence and passes context between them.

### Step 3.5: Define Agent Abstraction Interfaces

Before building the orchestrator, define the `Agent`, `WorkflowEngine`, and `Orchestrator` interfaces (see "Agentic Framework Strategy" above). Implement the MVP concrete classes (`ClaudeAgent`, `TaskGraphWorkflowEngine`, `SimpleOrchestrator`). This ensures the multi-agent system is built against abstractions from day one, making a future framework swap non-breaking.

### Step 4: Add Agent Team UI

Add a sidebar to Bolt.diy's existing chat interface:

```
┌──────────────────────────────────────────────┐
│ [Agent Team]        │ [Chat / Code / Preview] │
│                     │                          │
│ ✅ Product Manager  │  Building task mgmt app  │
│    "Plan complete"  │                          │
│                     │  > PM: Here's the plan:  │
│ ⚙️ Architect        │    - User auth module    │
│    "Designing..."   │    - Task CRUD API       │
│                     │    - React dashboard     │
│ ⏳ Backend Eng      │                          │
│ ⏳ Frontend Eng     │  > Architect: Structure: │
│ ⏳ QA Engineer      │    apps/api/ (Fastify)   │
│                     │    apps/web/ (React)     │
│ Tokens: 12,450      │                          │
│ Cost: ~$0.35        │  [Code] [Preview] [Deploy]│
└──────────────────────────────────────────────┘
```

### Step 5: Add Billing (Stripe)

- 2 tiers to start:
  - **Free**: 3 projects, 5 agent runs/day (to get people in the door)
  - **Pro ($49/mo)**: Unlimited projects, 100 agent runs/day, deploy to custom URLs
- Stripe Checkout for upgrade
- Usage metering: count agent runs per day, block when limit hit

### Step 6: Deploy

- **Host on Railway or Fly.io** (one-click deploy, Bolt.diy already has Railway template)
- **Neon** for PostgreSQL
- **Upstash** for Redis (rate limiting)
- **Domain**: shipwright.dev (or whatever's available)
- **Monitoring**: Sentry for errors

---

## Tech Stack (Minimal)

| Layer | Choice | Why |
|-------|--------|-----|
| Base | Bolt.diy (Remix + React) | Already built, just extend |
| Auth | Clerk | Managed, fast to integrate |
| Database | Neon PostgreSQL | Serverless, free tier |
| AI | Anthropic Claude API | Best coding model, via Vercel AI SDK (already in Bolt.diy) |
| Billing | Stripe | Industry standard |
| Hosting | Railway or Fly.io | Easy deploy, Bolt.diy already has Railway template |
| Monitoring | Sentry | Error tracking |

**Total new dependencies**: Clerk, Stripe, Neon PostgreSQL, Prisma. Everything else comes from Bolt.diy.

---

## What Makes This Different From Plain Bolt.diy

Bolt.diy is a single-agent chatbot that writes code. Shipwright is a **team of specialists**:

| Bolt.diy | Shipwright |
|----------|-----------|
| One LLM prompt, one response | 5 agents working in sequence |
| No planning phase | PM creates a plan, Architect designs structure BEFORE coding |
| User has to guide everything | Orchestrator manages the entire workflow automatically |
| No testing | QA agent runs tests and fixes failures |
| No quality checks | Quality gates validate the output |
| Generic system prompt | Each agent has specialized instructions refined over months of real use |

The ConnectSW agent definitions (`.claude/agents/*.md`) are the real IP -- they've been battle-tested building 5 real products. That's what makes the output quality different from a generic AI builder.

---

## Implementation Order

1. Fork Bolt.diy, verify it runs, understand the codebase
2. Add Clerk auth (sign up / sign in / protect routes)
3. Add Neon PostgreSQL + Prisma (users, projects, usage tables)
4. Define Agent/WorkflowEngine/Orchestrator interfaces + MVP implementations
5. Build the multi-agent orchestrator (port task-graph-executor.ts + agent definitions)
6. Replace Bolt.diy's single LLM call with the orchestrator pipeline
7. Add agent team sidebar UI
8. Add Stripe billing (free + pro tiers)
9. Deploy to Railway/Fly.io
10. Landing page (can be a simple page within the Remix app)
11. Test end-to-end: sign up → prompt → agents work → code → preview → deploy

---

## Verification

After building, verify with:
1. Sign up as new user → lands on dashboard
2. Create project "Build a todo app with auth" → agents work in sequence → code appears → preview works
3. Hit free tier limit → upgrade prompt appears → Stripe checkout works
4. Deploy project → get a live URL
5. Check billing → usage recorded correctly

---

## Future (Phase 2, only after MVP validated)

Only build these AFTER the MVP has paying customers:
- GitHub integration
- Team collaboration
- More agents (DevOps, Security, Technical Writer)
- Custom domains for deployments
- Agent memory across projects
- White-label (Phase 3)
- Enterprise SSO (Phase 3)
