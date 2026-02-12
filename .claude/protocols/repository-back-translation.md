# Repository Back-Translation Protocol

**Inspired by**: FullStack-Agent (arXiv:2602.03798) — Repository Back-Translation methodology
**Purpose**: Transform ConnectSW's production codebases into structured agent learning trajectories

## Concept

FullStack-Agent's key insight: you can take a finished, working codebase and reverse-engineer the development trajectory — the step-by-step sequence of decisions and actions an agent *would have* taken to build it from scratch. This creates high-quality training data from real production code.

ConnectSW adaptation: instead of fine-tuning an LLM, we generate **exemplar trajectories** that agents reference via the memory system when building similar features.

## How It Works

### Phase 1: Information Gathering

An agent (Innovation Specialist or Architect) explores a production product and generates a comprehensive understanding:

```
Input: products/[product]/  (complete codebase)

Process:
1. Read all source files, tests, configs, docs
2. Map the dependency graph (what imports what)
3. Identify the architectural patterns used
4. Trace data flow from frontend to database
5. Catalog all external dependencies and why they were chosen
6. Document all design decisions (explicit ADRs + implicit patterns)

Output: products/[product]/docs/trajectory/understanding.md
```

### Phase 2: Trajectory Generation

Reconstruct how the product *should have been built* in an ideal spec-driven workflow:

```
From the understanding document, generate:

1. Specification Trajectory
   └── What /speckit.specify would have produced
       ├── User stories with acceptance criteria
       ├── Functional requirements (FR-001, FR-002, ...)
       ├── Non-functional requirements
       └── Component reuse decisions

2. Planning Trajectory
   └── What /speckit.plan would have produced
       ├── Constitution check results
       ├── Research decisions (which libraries, why)
       ├── Data model design sequence
       ├── API contract evolution
       └── Architecture decisions with rationale

3. Task Trajectory
   └── What /speckit.tasks would have produced
       ├── Phase-ordered task list
       ├── Which tasks were parallel vs sequential
       ├── TDD ordering (test → implementation)
       └── Dependency graph

4. Implementation Trajectory (most valuable)
   └── The step-by-step build sequence
       ├── Step 1: Project setup (package.json, tsconfig, etc.)
       ├── Step 2: Database schema (Prisma) + first migration
       ├── Step 3: Health endpoint + test
       ├── Step 4: Auth plugin + test
       ├── Step 5: First CRUD route + test
       ├── ...
       ├── Step N-1: E2E tests
       └── Step N: Documentation

   For each step:
   ├── Files created/modified (with key code snippets)
   ├── Tests written (red phase)
   ├── Implementation (green phase)
   ├── Refactoring done
   ├── Dev-test results
   ├── Decisions made and why
   ├── Bugs encountered and how they were fixed
   └── Time estimate (for future planning)
```

### Phase 3: Pattern Extraction

From the trajectory, extract reusable patterns:

```
For each significant decision point:

1. Pattern Name: [descriptive name]
2. Context: [when this pattern applies]
3. Problem: [what was being solved]
4. Solution: [what was done]
5. Code: [key code snippet]
6. Alternatives Rejected: [what else was considered]
7. Confidence: [high/medium/low based on outcome]
8. Reuse Guidance: [when to copy this pattern]
```

## Output Structure

```
products/[product]/docs/trajectory/
├── understanding.md          # Phase 1: Complete codebase understanding
├── spec-trajectory.md        # Phase 2a: How specs would have been written
├── plan-trajectory.md        # Phase 2b: How plans would have been created
├── task-trajectory.md        # Phase 2c: How tasks would have been ordered
├── impl-trajectory.md        # Phase 2d: Step-by-step build sequence
└── patterns-extracted.json   # Phase 3: Reusable patterns for memory system
```

## Integration with Agent Memory

### Injecting into Experience Memory

The extracted patterns feed into `.claude/memory/agent-experiences/[agent].json`:

```json
{
  "learned_patterns": [
    {
      "id": "TRAJ-SG-001",
      "source": "stablecoin-gateway back-translation",
      "name": "Fastify Plugin Architecture for Auth",
      "context": "Building auth in a Fastify backend with JWT + API keys",
      "problem": "Need dual auth (browser JWT + programmatic API keys)",
      "solution": "Create Fastify plugin that checks both, with circuit breaker for API key validation",
      "confidence": "high",
      "times_applied": 3,
      "success_rate": 1.0,
      "code_reference": "products/stablecoin-gateway/apps/api/src/plugins/auth.ts"
    }
  ]
}
```

### Injecting into Company Knowledge

The architectural patterns feed into `.claude/memory/company-knowledge.json`:

```json
{
  "patterns": [
    {
      "id": "TRAJ-PATTERN-001",
      "name": "Full-Stack Product Bootstrap Sequence",
      "category": "architecture",
      "source": "back-translation of stablecoin-gateway, invoiceforge, pulse",
      "description": "Optimal ordering for bootstrapping a new ConnectSW product",
      "sequence": [
        "1. package.json + tsconfig (both apps)",
        "2. Prisma schema with User + base models",
        "3. Fastify server with health endpoint",
        "4. Auth plugin (copy from COMPONENT-REGISTRY)",
        "5. First CRUD route with integration test",
        "6. Next.js app with layout + login page",
        "7. API client setup",
        "8. Dashboard page with real data",
        "9. E2E smoke tests"
      ],
      "confidence": "high",
      "learned_from": ["stablecoin-gateway", "invoiceforge", "pulse"]
    }
  ]
}
```

### Injecting into Orchestrator Task Templates

The task trajectories inform the orchestrator's task graph engine:

```json
{
  "task_templates": {
    "full_stack_bootstrap": {
      "source": "back-translation of 3 production products",
      "phases": [
        {
          "name": "Setup",
          "tasks": 4,
          "typical_duration_minutes": 15,
          "parallel_opportunities": 2
        },
        {
          "name": "Foundation",
          "tasks": 8,
          "typical_duration_minutes": 45,
          "parallel_opportunities": 4,
          "notes": "Backend and frontend can run in parallel after task 3"
        }
      ]
    }
  }
}
```

## Products to Back-Translate

| Product | Priority | Rationale |
|---------|----------|-----------|
| stablecoin-gateway | HIGH | Most mature, production-hardened, full-stack with SDK |
| invoiceforge | HIGH | Production with AI integration and Stripe billing |
| pulse | MEDIUM | Full-stack + mobile, complex GitHub OAuth |
| quantum-computing-usecases | LOW | Frontend-only prototype |
| muaththir | SKIP | Still in inception, no code to back-translate |

## When to Run

1. **After each product reaches production** — generate trajectory for the final state
2. **After major refactors** — update trajectory to reflect improved patterns
3. **Quarterly review** — re-extract patterns across all products for cross-pollination
4. **Before new product inception** — agents reference existing trajectories for bootstrapping

## Metrics

Track in `.claude/memory/metrics/back-translation-metrics.json`:

```json
{
  "products_translated": 0,
  "patterns_extracted": 0,
  "patterns_reused_in_new_products": 0,
  "average_bootstrap_time_before_minutes": null,
  "average_bootstrap_time_after_minutes": null,
  "improvement_percentage": null
}
```

**Target**: New products bootstrap 40%+ faster by referencing trajectories from existing products.
