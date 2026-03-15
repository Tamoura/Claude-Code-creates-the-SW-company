# AI Agents: Architecture, Frameworks, and Production Considerations

AI agents are systems where a language model autonomously decides what actions to take, executes those actions using tools, observes the results, and iterates until a goal is achieved. Unlike simple LLM completions that produce text in a single pass, agents operate in loops: they reason about the current state, select and invoke tools, interpret tool outputs, and plan next steps. For CTOs, agents represent both a powerful new capability and a significant operational challenge -- they are harder to predict, harder to debug, and harder to cost-control than deterministic software.

## When to Use / When NOT to Use

| Scenario | Agents Recommended | Simple Completion Recommended |
|----------|-------------------|-------------------------------|
| Multi-step research across multiple data sources | Yes -- agent can query, synthesize, and iterate | No -- too many steps for a single prompt |
| Complex workflows with conditional logic | Yes -- agent handles branching decisions | No -- output would need extensive parsing and re-prompting |
| Tasks requiring tool use (API calls, database queries, file operations) | Yes -- core agent capability | Only if 1-2 tool calls suffice (function calling) |
| Simple text generation (summaries, drafts, translations) | No -- overkill, slower, and more expensive | Yes -- single completion is sufficient |
| Classification or extraction from a single document | No -- does not require iterative reasoning | Yes -- one-shot or few-shot prompting works well |
| Real-time user-facing features (<2s latency requirement) | No -- agent loops take 5-60+ seconds | Yes -- single completion meets latency needs |
| Deterministic workflows with known steps | No -- use traditional code orchestration | Maybe -- depends on whether NLU is needed for inputs |
| Tasks where errors compound (financial calculations, legal analysis) | Caution -- each step can introduce errors | Better with human-in-the-loop at each step |

## How AI Agents Work

### The Agent Loop

Every agent follows the same fundamental cycle:

1. **Observe:** The agent receives the current state -- the user's request, conversation history, tool outputs from previous steps, and any environmental context.
2. **Think/Reason:** The LLM processes the state and decides what to do next. This may involve breaking the problem into sub-tasks, evaluating which tool to use, or determining that the task is complete.
3. **Act:** The agent invokes a tool (API call, database query, code execution, web search) or produces a final response.
4. **Observe result:** The tool output is appended to the agent's context, and the loop repeats.

This loop continues until the agent determines the task is complete, hits a maximum iteration limit, or encounters an unrecoverable error.

### The ReAct Pattern

ReAct (Reasoning + Acting) is the foundational pattern for most agent implementations. Introduced by Yao et al. (2022), it interleaves reasoning traces with actions:

```
Thought: I need to find the company's Q3 revenue. I should search the financial database.
Action: search_financials(company="Acme Corp", period="Q3 2025")
Observation: Revenue: $12.4M, up 15% YoY
Thought: Now I need to compare this with the industry average. I should search for industry benchmarks.
Action: search_benchmarks(industry="SaaS", metric="revenue_growth", period="Q3 2025")
Observation: Industry average revenue growth: 8% YoY
Thought: Acme Corp's 15% growth exceeds the 8% industry average. I have enough information to answer.
Answer: Acme Corp's Q3 2025 revenue was $12.4M with 15% YoY growth, nearly double the SaaS industry average of 8%.
```

The reasoning traces serve two purposes: they improve the model's decision quality (chain-of-thought reasoning) and they provide an audit trail for debugging.

### Tool Use

Tools are functions that the agent can invoke. They bridge the gap between the LLM's language capabilities and the outside world.

**Common tool categories:**
- **Data retrieval:** Database queries, API calls, web search, file reading
- **Data manipulation:** Calculations, transformations, code execution
- **External actions:** Sending emails, creating tickets, updating records
- **Human escalation:** Requesting human input when confidence is low

**Tool design principles:**
- Tools should be atomic: one tool, one responsibility
- Tool descriptions must be clear and precise -- the LLM uses the description to decide when to call the tool
- Include input validation in tool implementations, not in the prompt
- Return structured data (JSON) rather than natural language from tools
- Include error information in tool responses so the agent can retry or adapt

## Multi-Step Workflows

### Sequential Agents

Steps execute one after another, with each step's output feeding into the next. This is the simplest multi-step pattern.

**Example:** Customer support escalation
1. Agent classifies the incoming ticket (billing, technical, account)
2. Agent retrieves relevant knowledge base articles
3. Agent drafts a response
4. Agent evaluates whether the response is sufficient or needs human escalation

### Parallel Agents

Multiple agents or tool calls execute simultaneously, with results aggregated afterward.

**Example:** Market research
- Agent A searches financial databases
- Agent B searches news articles
- Agent C searches patent filings
- Aggregator agent synthesizes results from A, B, and C

### Hierarchical Agents (Supervisor Pattern)

A supervisor agent delegates sub-tasks to specialist agents, coordinates their work, and synthesizes results.

**Example:** Code review agent
- Supervisor receives a pull request
- Delegates security review to Security Agent
- Delegates performance review to Performance Agent
- Delegates style review to Style Agent
- Supervisor synthesizes reviews into a single report

## Framework Comparison

| Framework | Architecture | Strengths | Weaknesses | Best For |
|-----------|-------------|-----------|------------|----------|
| LangGraph | Graph-based state machine | Precise control over agent flow, human-in-the-loop, persistence, debugging | Steeper learning curve, Python-centric | Production applications needing deterministic control |
| CrewAI | Role-based multi-agent | Intuitive multi-agent setup, role definitions, delegation | Less control over execution flow, harder to debug | Multi-agent scenarios with clear role separation |
| AutoGen (Microsoft) | Conversational multi-agent | Strong multi-agent conversation, code execution sandbox | Complex configuration, heavy framework | Research, code generation, multi-agent debate |
| Semantic Kernel (Microsoft) | Plugin-based, enterprise | .NET and Java support, enterprise integrations, planner | Smaller community, Microsoft ecosystem bias | Enterprise applications, .NET/Java shops |
| Vercel AI SDK | Streaming-first, TypeScript | Excellent DX for web apps, streaming, React integration | Less mature agent patterns | TypeScript/Next.js applications |
| Custom (direct API) | Whatever you build | Full control, no framework overhead, no dependency risk | More code to write and maintain | Simple agents, when frameworks add unnecessary complexity |

### Framework selection guidance

**Start without a framework** if your agent has fewer than 5 tools and a linear workflow. A simple while loop with an LLM call and tool dispatch is easier to understand, debug, and maintain than any framework.

**Use LangGraph** when you need complex control flow (conditional branching, parallel execution, human approval steps, state persistence). LangGraph's explicit graph definition makes complex workflows predictable and debuggable.

**Use CrewAI** when the problem naturally decomposes into roles (researcher, writer, reviewer) and you want rapid prototyping of multi-agent systems.

**Avoid framework lock-in.** Wrap framework-specific code in thin abstractions so you can swap frameworks or go custom without rewriting business logic.

## Production Considerations

### Reliability

Agents are inherently less reliable than deterministic code. Each step in the agent loop introduces a probability of error, and errors compound.

**Mitigation strategies:**
- **Maximum iteration limits.** Set hard limits on the number of agent loop iterations (typically 5-15). An agent that has not completed its task in 15 steps is likely stuck.
- **Tool call validation.** Validate tool inputs before execution. Reject malformed calls with a clear error message so the agent can self-correct.
- **Retry with backoff.** LLM API calls fail. Implement exponential backoff with jitter. Consider fallback models (e.g., try Claude, fall back to GPT-4).
- **Deterministic guardrails.** Use traditional code for steps that must be reliable (input validation, output formatting, database writes). Use the agent for steps that benefit from flexibility (reasoning, prioritization, synthesis).
- **Human-in-the-loop checkpoints.** For high-stakes actions (sending emails, making purchases, modifying production data), require human approval before execution.

### Observability

Agents are difficult to debug without proper observability. Each run produces a trace of reasoning steps and tool calls that must be logged and queryable.

**Essential logging:**
- Full trace of every agent step: input, reasoning, tool call, tool output
- Token counts per step and per run (for cost tracking)
- Latency per step and total run duration
- Final outcome: success, failure, timeout, human escalation
- Tool call success/failure rates

**Tools:** LangSmith (LangChain ecosystem), Braintrust, Langfuse (open source), or custom logging to your existing observability stack.

### Cost Control

Agents consume significantly more tokens than simple completions because each loop iteration requires sending the full conversation history plus tool outputs to the LLM.

**Cost drivers:**
- **Context window growth:** Each tool output adds to the context. A 10-step agent run might consume 50K+ tokens in the final iteration.
- **Model choice:** Using GPT-4o for every agent step is expensive. Use cheaper models for simple reasoning steps and expensive models for complex decisions.
- **Runaway agents:** Without iteration limits, an agent can loop indefinitely, accumulating costs. Always set hard limits.

**Cost control strategies:**
- Summarize conversation history periodically to prevent context window growth
- Use model routing: cheap models for tool selection, expensive models for synthesis
- Set per-run token budgets and abort if exceeded
- Cache tool outputs when the same query produces deterministic results
- Monitor cost per agent run and alert on anomalies

### Latency

Agent runs are slow. A typical 5-step agent run takes 10-30 seconds, with each step requiring an LLM call (1-5 seconds) plus tool execution (variable).

**Optimization strategies:**
- Stream intermediate results to the user so they see progress
- Execute independent tool calls in parallel
- Pre-fetch likely-needed data before the agent loop begins
- Use faster models for intermediate steps
- Cache frequently-used tool results

## When Agents Add Value vs Simple Completion

The decision to use an agent should be based on task complexity, not technology enthusiasm.

**Agents add value when:**
- The task requires multiple steps that depend on intermediate results
- The optimal path through the task is not known in advance
- Different inputs require different sequences of actions
- The task involves searching, filtering, and synthesizing information from multiple sources
- Human-like judgment is needed to decide what to do next

**Simple completion is better when:**
- The task can be fully specified in a single prompt
- The output format is predictable and consistent
- No external tools or data sources are needed
- Latency matters more than thoroughness
- The task is well-defined enough that a single LLM call produces good results

**The "would a smart intern need to ask follow-up questions?" test:** If a task can be completed by reading the instructions once and producing output, use simple completion. If the intern would need to look things up, try different approaches, and iterate, consider an agent.

## Real-World Examples

**Devin by Cognition (2024):** Devin is an AI software engineer agent that can plan, write code, debug, and deploy applications. It uses a combination of code execution tools, web browsing, and terminal access. While impressive in demos, real-world performance showed that autonomous coding agents still struggle with large codebases and ambiguous requirements. Key lesson: agent capability in demos does not equal agent reliability in production.

**Lindy.ai (2024):** Lindy provides customizable AI agents for business workflows -- email management, meeting scheduling, customer support. Their approach emphasizes narrow, well-defined agent scopes rather than general-purpose agents. Each "Lindy" handles one workflow with specific tools and guardrails. Key lesson: constrained agents outperform general-purpose agents in production.

**OpenAI's Deep Research (2025):** OpenAI released a research agent that browses the web, reads papers, and synthesizes findings into a report. It runs for 5-30 minutes per query, illustrating the latency trade-off of agentic systems. Key lesson: agents can deliver high-quality results when users accept async delivery.

**GitHub Copilot Workspace (2024):** GitHub extended Copilot from code completion to an agent that can understand issues, propose implementation plans, write code across multiple files, and run tests. Their approach uses a structured plan-implement-validate loop with human checkpoints. Key lesson: human-in-the-loop at planning and validation stages is critical for agent reliability.

## Decision Framework

**Build an agent when:**
- The workflow has 3+ steps with conditional branching
- Steps require external tool use (APIs, databases, search)
- The optimal sequence of steps varies by input
- You have engineering capacity to build observability and guardrails
- Users will tolerate 10-60 second response times (or async delivery)

**Use function calling (single-step tool use) when:**
- The task requires 1-2 tool calls with predictable flow
- Latency must stay under 5 seconds
- The tools needed can be determined from the initial input without iteration

**Use simple completion when:**
- No tools are needed
- The task is well-defined and single-step
- Latency must stay under 2 seconds
- Deterministic, predictable output is preferred

## Common Mistakes

1. **Building agents when simple prompts suffice.** The most common mistake. If a well-crafted prompt with function calling solves the problem, an agent adds complexity, cost, and latency without proportional benefit.

2. **Not setting iteration limits.** An agent without a maximum step count will loop indefinitely on edge cases, consuming tokens and compute until something crashes or the budget is exhausted.

3. **Insufficient tool descriptions.** The agent selects tools based on their descriptions. Vague descriptions lead to wrong tool selection, failed steps, and wasted tokens. Invest time in precise, example-rich tool descriptions.

4. **Not logging full agent traces.** When an agent produces a wrong answer, you need the complete reasoning and tool call history to diagnose the issue. Without traces, debugging is guesswork.

5. **Giving agents too many tools.** More tools means more decision complexity for the model. Agents with 3-7 tools perform better than agents with 20+ tools. Group related functionality into composite tools when possible.

6. **No cost alerts.** A single runaway agent can cost more than a month of normal operation. Set per-run budgets and alert on anomalies.

7. **Deploying without human-in-the-loop for high-stakes actions.** Agents make mistakes. Any action with real-world consequences (sending money, deleting data, contacting users) must require human approval in production.

## Key Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Task completion rate | >85% without human intervention | Measures agent autonomy and reliability |
| Average steps per task | <10 for most workflows | Fewer steps = lower cost and latency |
| Cost per agent run | Defined per workflow, tracked daily | Prevents cost overruns |
| Average run duration | <30s for interactive, <5min for async | User experience and resource utilization |
| Tool call success rate | >95% per tool | Low success rate indicates bad tool design or descriptions |
| Hallucination/error rate | <5% of final outputs | Trust and accuracy |
| Human escalation rate | 10-30% (task-dependent) | Too low suggests overconfidence; too high suggests the agent is not adding value |
| Token consumption per run (P50/P95) | Tracked and trending down | Measures optimization progress |

## References

- Yao, S. et al. "ReAct: Synergizing Reasoning and Acting in Language Models." ICLR 2023.
- LangGraph documentation. "Agent Architectures" -- https://langchain-ai.github.io/langgraph/
- CrewAI documentation -- https://docs.crewai.com/
- AutoGen documentation -- https://microsoft.github.io/autogen/
- Anthropic. "Building Effective Agents" -- https://docs.anthropic.com/en/docs/build-with-claude/agentic
- OpenAI. "Function Calling Guide" -- https://platform.openai.com/docs/guides/function-calling
- Harrison Chase (LangChain). "What is an AI Agent?" -- https://blog.langchain.dev/
- Karpathy, A. "State of GPT" (Microsoft Build 2023) -- architecture of agent systems.
- Cognition Labs. "Introducing Devin" -- https://www.cognition.ai/blog
- Lilian Weng. "LLM Powered Autonomous Agents" -- https://lilianweng.github.io/posts/2023-06-23-agent/
