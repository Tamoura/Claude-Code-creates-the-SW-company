# ConnectSW v2.0 Integration with Claude Code

**Critical Question**: How does ConnectSW (the agentic software company platform) integrate with Claude Code (Anthropic's official CLI)?

---

## Current Reality

**What we're doing right now**:
- Using Claude Code CLI to BUILD ConnectSW
- Claude Code is our development environment
- We've created `.claude/` directory structure (orchestrator, agents, workflows) that could work with Claude Code's system

**The confusion**:
- v2.0 strategic plan describes ConnectSW as standalone multi-tenant SaaS platform
- But we're building it using Claude Code's infrastructure
- **Question**: Should ConnectSW leverage Claude Code or be independent?

---

## Integration Option 1: Build ON Claude Code (Recommended)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ConnectSW Platform v2.0                   │
│                   (Multi-Tenant SaaS Layer)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │          ConnectSW Orchestrator                        │ │
│  │  - Task decomposition                                  │ │
│  │  - Multi-tenant routing                               │ │
│  │  - Memory & learning                                   │ │
│  │  - Quality gates                                       │ │
│  └────────────┬───────────────────────────────────────────┘ │
│               │                                              │
│               ↓                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │        Claude Code Agent Executors                     │ │
│  │  Each agent is a Claude Code session                   │ │
│  └────────────┬───────────────────────────────────────────┘ │
└───────────────┼──────────────────────────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────────────────────────┐
│              Claude Code (Execution Engine)                  │
├─────────────────────────────────────────────────────────────┤
│  - File system operations (Read, Write, Edit, Glob, Grep)   │
│  - Bash command execution                                    │
│  - Git integration                                           │
│  - MCP server access                                         │
│  - Tool system                                               │
│  - Claude API access                                         │
└─────────────────────────────────────────────────────────────┘
```

### How It Works

1. **Customer Request** (via ConnectSW web UI)
   - "Create a new SaaS product for invoicing"

2. **ConnectSW Orchestrator**
   - Receives request
   - Creates task graph
   - Routes to appropriate tenant workspace

3. **Agent Execution** (via Claude Code)
   - Orchestrator spawns Claude Code session for each agent
   - Example: `claude-code --project=/workspaces/tenant-123/product-invoicing`
   - Agent uses Claude Code tools (Read, Write, Bash, etc.)
   - Agent has access to MCP servers (GitHub, database, etc.)

4. **Results Flow Back**
   - Claude Code session completes task
   - Returns results via AgentMessage JSON
   - ConnectSW orchestrator routes to next agent
   - Quality gates run via Claude Code tools

### Benefits

✅ **Leverage Anthropic's Infrastructure**
- Don't reinvent file operations, git integration, tool system
- Benefit from Claude Code updates and improvements
- Official support from Anthropic

✅ **Lower Development Cost**
- 50-70% less code to write (reuse Claude Code primitives)
- Focus on orchestration logic, not execution plumbing
- Faster time to market

✅ **Better Agent Capabilities**
- Agents inherit all Claude Code tools automatically
- MCP server ecosystem (access to any MCP-compatible service)
- Future Claude Code features automatically available

✅ **Easier Customer Customization**
- Customers can extend agents using Claude Code's extension system
- Custom MCP servers for proprietary APIs
- Familiar environment for technical customers

✅ **Official Anthropic Partnership Potential**
- Could become official "Claude Code for Teams" or "Claude Code Cloud"
- Co-marketing opportunities
- Priority API access, volume discounts

### Technical Implementation

#### 1. Claude Code Session Manager

```typescript
// connectsw-platform/src/claude-code-session-manager.ts

import { spawn } from 'child_process';
import { AgentMessage } from './types';

export class ClaudeCodeSessionManager {
  /**
   * Spawn a Claude Code session for an agent
   */
  async spawnAgentSession(
    tenantId: string,
    productId: string,
    taskId: string,
    agentType: string,
    prompt: string
  ): Promise<AgentMessage> {
    // Create isolated workspace for this tenant/product
    const workspacePath = `/workspaces/${tenantId}/${productId}`;

    // Spawn Claude Code CLI session
    const session = spawn('claude-code', [
      '--project', workspacePath,
      '--prompt', prompt,
      '--output-json',  // Return structured output
      '--headless',     // No interactive UI
    ]);

    // Capture output
    let output = '';
    session.stdout.on('data', (data) => {
      output += data.toString();
    });

    // Wait for completion
    await new Promise((resolve, reject) => {
      session.on('close', (code) => {
        if (code === 0) resolve(output);
        else reject(new Error(`Session failed with code ${code}`));
      });
    });

    // Parse AgentMessage JSON from output
    return JSON.parse(output);
  }

  /**
   * Create workspace for tenant
   */
  async provisionWorkspace(tenantId: string): Promise<void> {
    const workspacePath = `/workspaces/${tenantId}`;

    // Initialize git repo
    await this.execInWorkspace(workspacePath, 'git init');
    await this.execInWorkspace(workspacePath, 'git config user.name "ConnectSW Bot"');
    await this.execInWorkspace(workspacePath, 'git config user.email "bot@connectsw.ai"');

    // Copy .claude/ configuration
    await this.copyClaudeConfig(workspacePath);
  }
}
```

#### 2. ConnectSW Orchestrator (Claude Code Compatible)

```typescript
// connectsw-platform/src/orchestrator.ts

export class ConnectSWOrchestrator {
  private sessionManager: ClaudeCodeSessionManager;

  async executeTaskGraph(
    tenantId: string,
    productId: string,
    taskGraph: TaskGraph
  ): Promise<ExecutionResult> {
    const readyTasks = this.getReadyTasks(taskGraph);

    // Execute tasks in parallel (each in separate Claude Code session)
    const results = await Promise.all(
      readyTasks.map(task => this.executeTask(tenantId, productId, task))
    );

    return this.aggregateResults(results);
  }

  private async executeTask(
    tenantId: string,
    productId: string,
    task: Task
  ): Promise<AgentMessage> {
    // Build prompt for Claude Code agent
    const prompt = this.buildAgentPrompt(task);

    // Spawn Claude Code session
    const result = await this.sessionManager.spawnAgentSession(
      tenantId,
      productId,
      task.id,
      task.agent,
      prompt
    );

    // Process result
    await this.updateTaskGraph(tenantId, productId, task.id, result);
    await this.updateAgentMemory(tenantId, task.agent, result);

    return result;
  }
}
```

#### 3. Agent Prompt Template (Claude Code Compatible)

```typescript
function buildAgentPrompt(task: Task): string {
  return `
You are the ${task.agent} for ConnectSW.

## Your Task

**Task ID**: ${task.id}
**Product**: ${task.product}
**Description**: ${task.description}

## Context

You have access to all Claude Code tools:
- Read, Write, Edit for file operations
- Bash for running commands
- Glob, Grep for searching
- Task for spawning sub-agents
- MCP servers for external integrations

## Instructions

1. Read your agent instructions from .claude/agents/${task.agent}.md
2. Execute the task using Claude Code tools
3. Follow TDD principles (if writing code)
4. Run quality gates before completion
5. Return results as AgentMessage JSON:

{
  "metadata": {
    "from": "${task.agent}",
    "to": "orchestrator",
    "timestamp": "ISO-8601",
    "message_type": "task_complete",
    "task_id": "${task.id}"
  },
  "payload": {
    "status": "success",
    "summary": "What you accomplished",
    "artifacts": [
      {"path": "file/path", "type": "file", "description": "What this is"}
    ],
    "metrics": {
      "time_spent_minutes": 30,
      "tests_passing": true
    }
  }
}

## Execute Now

Begin working on the task. Use Claude Code tools as needed.
  `.trim();
}
```

#### 4. Multi-Tenant Workspace Isolation

```
/workspaces/
├── tenant-001/                    # Isolated workspace for Tenant 1
│   ├── product-invoicing/
│   │   ├── .git/
│   │   ├── .claude/               # Tenant-specific config
│   │   ├── apps/
│   │   └── docs/
│   └── product-crm/
│       └── ...
├── tenant-002/                    # Isolated workspace for Tenant 2
│   └── product-analytics/
│       └── ...
└── tenant-003/
    └── ...
```

**Isolation Mechanisms**:
- File system: Each tenant has separate directory
- Git: Separate repos per tenant/product
- Claude Code: Separate sessions with --project flag
- Secrets: Per-tenant environment variables
- Network: Kubernetes namespace isolation (if using containers)

---

## Integration Option 2: Standalone (Alternative)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ConnectSW Platform v2.0                   │
│                    (Fully Independent)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │          ConnectSW Orchestrator                        │ │
│  └────────────┬───────────────────────────────────────────┘ │
│               │                                              │
│               ↓                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │        ConnectSW Agent Runtime                         │ │
│  │  - Custom file operations                              │ │
│  │  - Custom git integration                              │ │
│  │  - Custom tool system                                  │ │
│  └────────────┬───────────────────────────────────────────┘ │
└───────────────┼──────────────────────────────────────────────┘
                │
                ↓ (Direct API calls)
┌─────────────────────────────────────────────────────────────┐
│                     Claude API (Anthropic)                   │
└─────────────────────────────────────────────────────────────┘
```

### Pros & Cons

**Pros**:
- ✅ Complete control over execution
- ✅ No dependency on Claude Code CLI
- ✅ Can optimize for specific use cases
- ✅ Independent versioning and releases

**Cons**:
- ❌ Must build all primitives from scratch
- ❌ 2-3x more development time
- ❌ Miss out on Claude Code improvements
- ❌ No MCP server compatibility
- ❌ No official Anthropic partnership potential

### Verdict

**Not recommended** unless Anthropic restricts commercial use of Claude Code in this way.

---

## Integration Option 3: Hybrid (Best of Both)

### Use Claude Code for Development, Custom Runtime for Production

**Development Mode** (using Claude Code):
- Engineers use Claude Code CLI to build ConnectSW
- Leverage all Claude Code features (MCP servers, tools, IDE integration)
- Rapid iteration

**Production Mode** (custom runtime):
- ConnectSW has optimized agent runtime for scale
- But compatible with Claude Code architecture (same tools, same APIs)
- Can run Claude Code agents without modification

### Verdict

**Good for later stages** (v3.0+) when scale demands custom optimization, but start with Option 1.

---

## Recommended Approach: Option 1 (Build on Claude Code)

### Strategic Rationale

1. **Speed to Market**
   - Launch v2.0 in 18 months (vs 24-30 with standalone)
   - Avoid reinventing primitives
   - Focus on orchestration and intelligence (our differentiation)

2. **Anthropic Partnership**
   - Potential official partnership ("Claude Code for Teams")
   - Co-marketing opportunities
   - Priority support and API access
   - Could become default commercial offering

3. **Better Product**
   - MCP server ecosystem immediately available
   - Benefit from Claude Code updates (better tools, faster execution)
   - Customers get familiar Claude Code experience

4. **Lower Risk**
   - If Claude Code gets better, we get better
   - If custom runtime needed later, can migrate (architecture compatible)
   - Not putting all eggs in one basket (can always build custom runtime)

### Implementation Plan

**Phase 1: Proof of Concept (Month 1)**
- Build ConnectSW orchestrator that spawns Claude Code sessions
- Test multi-tenant workspace isolation
- Validate performance (how many concurrent Claude Code sessions?)
- Measure cost (Claude API usage vs custom runtime)

**Phase 2: MVP (Months 2-6)**
- Full integration with Claude Code
- Multi-tenant platform using Claude Code as execution engine
- Web UI to orchestrate Claude Code agents
- Quality gates via Claude Code tools

**Phase 3: Scale Testing (Months 7-12)**
- Load test: 1000 concurrent Claude Code sessions
- Optimize: Connection pooling, caching, batching
- Monitor: Claude API rate limits, costs
- Decide: If custom runtime needed for scale (unlikely)

**Phase 4: Partnership (Months 12-18)**
- Approach Anthropic about official partnership
- "Claude Code Cloud" or "Claude Code for Teams"
- Negotiate: Volume pricing, co-marketing, white-label

---

## Technical Specifications

### 1. Claude Code Session Orchestration

**Requirements**:
- Spawn 1000+ concurrent Claude Code sessions
- Isolate workspaces (file system, git, secrets)
- Route requests to correct tenant session
- Handle session failures and retries
- Monitor resource usage (CPU, memory, API calls)

**Architecture**:
```
┌─────────────────────────────────────────────┐
│       ConnectSW Session Orchestrator        │
│  ┌─────────────────────────────────────┐   │
│  │     Session Pool Manager            │   │
│  │  - Warm sessions (ready to execute) │   │
│  │  - Active sessions (executing)       │   │
│  │  - Session recycling                │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │     Workspace Manager               │   │
│  │  - Tenant isolation                 │   │
│  │  - Git repo per product             │   │
│  │  - Secret injection                 │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │     Claude Code CLI Wrapper         │   │
│  │  - Spawn processes                  │   │
│  │  - Capture output                   │   │
│  │  - Handle errors                    │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 2. MCP Server Configuration (Per Tenant)

Each tenant can have custom MCP servers:

```json
// /workspaces/tenant-123/.claude/mcp.json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${TENANT_GITHUB_TOKEN}"
      }
    },
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp-server"],
      "env": {
        "STRIPE_API_KEY": "${TENANT_STRIPE_KEY}"
      }
    },
    "custom-api": {
      "command": "node",
      "args": ["tenant-custom-mcp-server.js"]
    }
  }
}
```

### 3. Cost Optimization

**Challenge**: Claude API costs could be high with 1000s of concurrent sessions

**Optimizations**:
1. **Session Pooling**: Reuse warm sessions instead of cold starts
2. **Prompt Caching**: Cache common prompts (agent instructions, company knowledge)
3. **Batch API Calls**: Group multiple agent prompts into single API call (if Anthropic supports)
4. **Cheaper Models for Simple Tasks**: Use Haiku for routine tasks, Sonnet for complex
5. **Smart Routing**: Route tasks to appropriate model based on complexity

**Cost Estimate**:
- Sonnet: $3 per million input tokens, $15 per million output tokens
- Average task: 10K input tokens + 5K output tokens = $0.105 per task
- 1M tasks/month = $105K/month in API costs
- At $50M ARR, this is ~2.5% COGS (acceptable)

### 4. Performance Benchmarks

**Target Metrics**:
- Session spawn time: <2 seconds (warm pool)
- Task execution time: 2-30 minutes (depending on complexity)
- Concurrent sessions: 1000+ per server
- Uptime: 99.9%

**Scaling**:
- Horizontal: Add more session orchestrator servers
- Vertical: Increase server resources (16-32 core machines)

---

## Migration Path (If Custom Runtime Needed Later)

**Scenario**: In Year 3-4, ConnectSW has 10,000+ customers and Claude Code overhead becomes bottleneck.

**Solution**: Build custom agent runtime but keep Claude Code compatibility.

**Steps**:
1. Extract agent execution logic from Claude Code
2. Implement custom tool system (Read, Write, Bash, etc.)
3. Keep same tool interfaces (agents don't change)
4. Migrate customers gradually (start with Enterprise tier)
5. Offer both: Claude Code (standard) and Custom Runtime (enterprise)

**Benefit**: Architecture designed for this from day 1 (loose coupling).

---

## Security Considerations

### 1. Workspace Isolation

**Threat**: Tenant A accesses Tenant B's code/data

**Mitigation**:
- File system: Strict directory permissions (chroot or containers)
- Git: Separate repos, separate GitHub orgs if needed
- Secrets: Per-tenant environment variables (vault-backed)
- Network: Namespace isolation (Kubernetes network policies)

### 2. Code Injection

**Threat**: Malicious tenant injects code into agent prompts

**Mitigation**:
- Sanitize all user inputs
- Sandboxed execution (Docker containers with limited privileges)
- Rate limiting (prevent abuse)
- Audit logs (track all agent actions)

### 3. Claude API Key Protection

**Threat**: Expose Anthropic API key to tenants

**Mitigation**:
- API key only in orchestrator (never in tenant workspace)
- Session manager proxies Claude API calls
- Tenants never see raw API responses (only parsed AgentMessages)

---

## Claude Code CLI Requirements

**What we need from Claude Code**:

1. **Headless Mode** ✅
   - Run without interactive UI
   - Already supported: Can be used programmatically

2. **Structured Output** ⚠️
   - Return JSON instead of plain text
   - May need to add: `--output-json` flag

3. **Session Isolation** ✅
   - `--project` flag for workspace isolation
   - Already supported

4. **Programmatic API** ⚠️
   - Node.js/Python SDK instead of CLI spawning
   - May need to request from Anthropic

5. **Multi-Tenancy Support** ❌
   - Rate limiting per tenant
   - Billing per tenant
   - Needs Anthropic to add

### Anthropic Partnership Ask

**Pitch to Anthropic**:
> "ConnectSW wants to build the first multi-tenant SaaS platform on Claude Code. We'll drive 10,000+ paying customers to Claude API. Can you help with:
> 1. Programmatic API for Claude Code (not just CLI)
> 2. Multi-tenant billing (separate API usage per ConnectSW customer)
> 3. Volume pricing (we'll do $10M+/year in API spend)
> 4. Co-marketing (official 'Claude Code for Teams' offering)"

**What Anthropic Gets**:
- $10M+/year API revenue (from our customers)
- Enterprise validation (ConnectSW customers = proof of concept)
- Distribution channel (we sell Claude Code to enterprises)
- Case studies (ConnectSW success = Claude API success)

---

## Conclusion

### ✅ Recommended: Build ConnectSW v2.0 ON Claude Code

**Why**:
1. **50-70% faster development** (reuse primitives)
2. **Better product** (MCP ecosystem, future improvements)
3. **Partnership potential** (official Anthropic offering)
4. **Lower risk** (can migrate to custom runtime if needed)

**Next Steps**:
1. Build POC (Month 1): Orchestrator + Claude Code session management
2. Validate performance and cost
3. Approach Anthropic about partnership
4. Full implementation (Months 2-6)

### 🎯 Success Criteria

**After 6 months**:
- ✅ 100 customers using Claude Code-based platform
- ✅ 1000+ concurrent sessions supported
- ✅ Claude API costs <5% of revenue
- ✅ Anthropic partnership discussions underway
- ✅ Customer satisfaction (NPS 60+)

**This approach makes ConnectSW the "Rails of autonomous development" - we're the opinionated framework built on Claude Code primitives.** 🚀
