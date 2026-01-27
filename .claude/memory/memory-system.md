# Agent Memory System

Agents learn from experience and share knowledge across products to become more effective over time.

## Purpose

- **Preserve Context**: Remember what worked, what failed, why decisions were made
- **Avoid Repetition**: Don't make the same mistakes on each product
- **Share Knowledge**: Backend engineer's learning helps next backend task
- **Improve Estimates**: Track actual vs estimated time
- **Build Company Knowledge**: Accumulate best practices

## Architecture

```
.claude/memory/
├── memory-system.md              # This document
├── company-knowledge.json        # Cross-product patterns and best practices
├── agent-experiences/
│   ├── product-manager.json
│   ├── architect.json
│   ├── backend-engineer.json
│   ├── frontend-engineer.json
│   ├── qa-engineer.json
│   ├── devops-engineer.json
│   ├── technical-writer.json
│   └── support-engineer.json
├── decision-log.json             # Why decisions were made
└── metrics/
    ├── agent-performance.json    # Success rates, timing
    └── product-metrics.json      # Per-product stats
```

## Memory Schema

### company-knowledge.json

```json
{
  "version": "1.0.0",
  "updated_at": "2025-01-26T10:00:00Z",

  "patterns": [
    {
      "id": "PATTERN-001",
      "name": "Fastify + Prisma Connection Pooling",
      "category": "backend",
      "description": "Use connection pooling to prevent exhaustion under load",
      "learned_from": {
        "product": "user-portal",
        "task": "BACKEND-05",
        "date": "2025-01-20"
      },
      "problem": "Database connections exhausted after 100 concurrent users",
      "solution": "Configure Prisma connection pool: connection_limit=10, pool_timeout=20s",
      "code_snippet": "// prisma/schema.prisma\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n  connection_limit = 10\n  pool_timeout = 20\n}",
      "when_to_use": "Any product using Fastify + Prisma with expected concurrent users > 50",
      "confidence": "high",
      "times_applied": 3,
      "success_rate": 1.0
    },
    {
      "id": "PATTERN-002",
      "name": "Next.js Tailwind CSS Configuration",
      "category": "frontend",
      "description": "Proper Tailwind setup for Next.js 14+ with TypeScript",
      "learned_from": {
        "product": "gpu-calculator",
        "task": "FRONTEND-01",
        "date": "2025-01-25"
      },
      "problem": "Tailwind classes not applying in production build",
      "solution": "Use app router compatible config with content paths",
      "code_snippet": "// tailwind.config.ts\nimport type { Config } from 'tailwindcss'\n\nconst config: Config = {\n  content: [\n    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',\n    './src/components/**/*.{js,ts,jsx,tsx,mdx}',\n    './src/app/**/*.{js,ts,jsx,tsx,mdx}',\n  ],\n  theme: { extend: {} },\n  plugins: [],\n}\nexport default config",
      "when_to_use": "Every Next.js + Tailwind project",
      "confidence": "high",
      "times_applied": 1,
      "success_rate": 1.0
    }
  ],

  "anti_patterns": [
    {
      "id": "ANTI-001",
      "name": "Using Mocks in E2E Tests",
      "category": "testing",
      "description": "DO NOT mock database or API calls in E2E tests",
      "learned_from": {
        "product": "early-project",
        "date": "2025-01-15"
      },
      "problem": "E2E tests passed but production had bugs",
      "why_its_bad": "Mocks hide integration issues, give false confidence",
      "correct_approach": "Use real database with seeded test data, real API calls",
      "times_encountered": 2
    }
  ],

  "tech_stack_decisions": [
    {
      "decision": "Use PostgreSQL as default database",
      "rationale": "ACID compliance, proven at scale, excellent Prisma support",
      "alternatives_considered": ["MongoDB", "MySQL"],
      "date": "2025-01-10",
      "applies_to": "All products unless specific reason otherwise"
    },
    {
      "decision": "Use Playwright for E2E testing",
      "rationale": "Cross-browser support, excellent developer experience, auto-wait",
      "alternatives_considered": ["Cypress", "Selenium"],
      "date": "2025-01-10",
      "applies_to": "All frontend testing"
    }
  ],

  "common_gotchas": [
    {
      "issue": "Next.js port conflicts in development",
      "solution": "Use ports 3100+ for frontend apps (configured in company standards)",
      "category": "configuration"
    },
    {
      "issue": "Prisma migrations fail in CI",
      "solution": "Always run 'prisma generate' before 'prisma migrate'",
      "category": "backend"
    }
  ]
}
```

### agent-experiences/backend-engineer.json

```json
{
  "agent": "backend-engineer",
  "version": "1.0.0",
  "updated_at": "2025-01-26T10:00:00Z",

  "learned_patterns": [
    {
      "pattern_id": "PATTERN-001",
      "first_applied": "2025-01-20",
      "products_applied": ["user-portal", "analytics-dashboard"],
      "notes": "Always check connection limits when setting up Prisma"
    }
  ],

  "task_history": [
    {
      "task_id": "BACKEND-01",
      "product": "gpu-calculator",
      "task_type": "foundation",
      "started_at": "2025-01-25T09:00:00Z",
      "completed_at": "2025-01-25T11:30:00Z",
      "estimated_minutes": 120,
      "actual_minutes": 150,
      "status": "success",
      "challenges": [
        "Had to debug Fastify plugin registration order",
        "Prisma client generation took longer than expected"
      ],
      "solutions": [
        "Registered plugins in correct order: logging → cors → prisma",
        "Added prisma generate to package.json postinstall script"
      ],
      "artifacts": [
        "products/gpu-calculator/apps/api/src/index.ts",
        "products/gpu-calculator/apps/api/prisma/schema.prisma"
      ],
      "tests_added": 15,
      "coverage_percent": 92
    }
  ],

  "common_mistakes": [
    {
      "mistake": "Forgot to add database indices on foreign keys",
      "occurred": 2,
      "last_occurrence": "2025-01-22",
      "impact": "Slow query performance discovered in production",
      "prevention": "Always run EXPLAIN ANALYZE on queries, add indices proactively",
      "checklist_item": "Add indices for all foreign keys and frequently queried columns"
    },
    {
      "mistake": "Didn't validate environment variables on startup",
      "occurred": 1,
      "last_occurrence": "2025-01-18",
      "impact": "App crashed in production with unclear error",
      "prevention": "Use Zod or similar to validate env vars in src/config.ts",
      "checklist_item": "Validate all required env vars on app startup"
    }
  ],

  "preferred_approaches": [
    {
      "scenario": "API error handling",
      "approach": "Use Fastify error handler with custom error classes",
      "reason": "Consistent error responses, easy to add logging/monitoring",
      "example": "throw new ValidationError('Invalid email format')"
    },
    {
      "scenario": "Database transactions",
      "approach": "Use Prisma.$transaction for multi-step operations",
      "reason": "Ensures atomicity, automatic rollback on error",
      "example": "await prisma.$transaction([op1, op2, op3])"
    }
  ],

  "efficiency_improvements": [
    {
      "area": "Test setup",
      "old_approach": "Manually seed database for each test file",
      "new_approach": "Shared test fixtures in tests/fixtures/",
      "time_saved_minutes": 30,
      "first_used": "2025-01-23"
    }
  ],

  "performance_metrics": {
    "tasks_completed": 5,
    "success_rate": 1.0,
    "average_time_minutes": 135,
    "median_time_minutes": 120,
    "on_time_delivery": 0.8,
    "test_coverage_average": 91
  }
}
```

### decision-log.json

```json
{
  "version": "1.0.0",
  "updated_at": "2025-01-26T10:00:00Z",

  "decisions": [
    {
      "id": "DEC-001",
      "date": "2025-01-25",
      "product": "gpu-calculator",
      "context": "Choosing state management for calculator form",
      "decision": "Use React useState (no Redux/Zustand)",
      "made_by": "frontend-engineer",
      "options_considered": [
        {
          "option": "React useState",
          "pros": ["Simple", "No dependencies", "Sufficient for single-page app"],
          "cons": ["Harder to scale if app grows"]
        },
        {
          "option": "Zustand",
          "pros": ["Easy global state", "Good DevTools"],
          "cons": ["Overkill for current requirements"]
        },
        {
          "option": "Redux Toolkit",
          "pros": ["Industry standard", "Powerful"],
          "cons": ["Too much boilerplate for simple app"]
        }
      ],
      "rationale": "Calculator is single page with limited state. useState is sufficient and keeps bundle size small.",
      "impact": "Faster development, smaller bundle",
      "revisit_if": "App grows beyond 3-4 pages OR state sharing becomes complex",
      "outcome": "Successful - app is fast and maintainable"
    },
    {
      "id": "DEC-002",
      "date": "2025-01-20",
      "product": "user-portal",
      "context": "Authentication strategy",
      "decision": "Session-based auth with Redis",
      "made_by": "architect",
      "approved_by": "CEO",
      "options_considered": [
        {
          "option": "JWT tokens",
          "pros": ["Stateless", "Easy to scale horizontally"],
          "cons": ["Can't invalidate easily", "Token size"]
        },
        {
          "option": "Session + Redis",
          "pros": ["Can invalidate immediately", "Secure"],
          "cons": ["Requires Redis infrastructure"]
        },
        {
          "option": "OAuth2 only",
          "pros": ["No password management"],
          "cons": ["Vendor lock-in", "Requires social accounts"]
        }
      ],
      "rationale": "Need ability to revoke sessions immediately for security. Redis is already in stack.",
      "impact": "Added Redis dependency, but better security posture",
      "revisit_if": "Redis becomes a bottleneck OR need to support mobile apps",
      "outcome": "Working well in production"
    }
  ]
}
```

### metrics/agent-performance.json

```json
{
  "version": "1.0.0",
  "period": "2025-01-01 to 2025-01-31",
  "updated_at": "2025-01-26T10:00:00Z",

  "agents": {
    "product-manager": {
      "tasks_completed": 3,
      "success_rate": 1.0,
      "avg_time_minutes": 110,
      "estimated_vs_actual": 0.92,
      "checkpoints_passed_first_try": 3,
      "ceo_revisions_requested": 0
    },
    "architect": {
      "tasks_completed": 3,
      "success_rate": 1.0,
      "avg_time_minutes": 165,
      "estimated_vs_actual": 0.88,
      "checkpoints_passed_first_try": 2,
      "ceo_revisions_requested": 1
    },
    "backend-engineer": {
      "tasks_completed": 5,
      "success_rate": 1.0,
      "avg_time_minutes": 135,
      "estimated_vs_actual": 0.82,
      "test_coverage_avg": 91,
      "tests_passed_first_run": 0.8
    },
    "frontend-engineer": {
      "tasks_completed": 4,
      "success_rate": 0.75,
      "avg_time_minutes": 180,
      "estimated_vs_actual": 0.67,
      "test_coverage_avg": 85,
      "tests_passed_first_run": 0.5,
      "common_issues": ["Tailwind CSS configuration", "E2E test flakiness"]
    },
    "qa-engineer": {
      "tasks_completed": 8,
      "success_rate": 1.0,
      "avg_time_minutes": 45,
      "testing_gates_run": 8,
      "testing_gates_passed_first_try": 6,
      "bugs_found": 5,
      "false_positives": 1
    },
    "devops-engineer": {
      "tasks_completed": 2,
      "success_rate": 1.0,
      "avg_time_minutes": 90,
      "estimated_vs_actual": 1.0,
      "deployments": 2,
      "deployment_success_rate": 1.0
    }
  },

  "insights": [
    "Frontend engineer has lower success rate due to CSS/styling issues - consider creating CSS checklist",
    "Backend engineer consistently underestimates time by 18% - adjust future estimates",
    "QA engineer is efficient - testing gates take ~45min on average"
  ]
}
```

## How Agents Use Memory

### When Assigned a Task

```markdown
1. Orchestrator invokes agent with task

2. Agent reads their memory file:
   Read: .claude/memory/agent-experiences/[agent-name].json

3. Agent checks company knowledge:
   Read: .claude/memory/company-knowledge.json

4. Agent looks for relevant patterns:
   - Filter by category matching task type
   - Check "when_to_use" conditions
   - Apply high-confidence patterns automatically

5. Agent checks for common mistakes:
   - Review mistakes relevant to current task
   - Use prevention checklists

6. Agent executes task with learned context

7. Agent reports back (via AgentMessage protocol)

8. Orchestrator updates agent memory:
   - Add to task_history
   - Update performance_metrics
   - If new pattern discovered, add to learned_patterns
```

### Example: Backend Engineer Using Memory

```markdown
Task: "Implement API foundation for analytics-dashboard"

Backend Engineer reads memory:
- Sees PATTERN-001 about Prisma connection pooling
- Checks: "when_to_use: expected concurrent users > 50"
- Analytics dashboard PRD says: "Expect 500+ concurrent users"
- Decision: APPLY pattern automatically

- Sees common_mistake: "Forgot to add database indices"
- Adds to checklist: Review schema, add indices

- Sees preferred_approach: "Use Fastify error handler"
- Applies pattern from previous work

- Sees efficiency_improvement: "Shared test fixtures"
- Reuses fixtures pattern from previous project

Result:
- Faster implementation (no need to rediscover patterns)
- Higher quality (avoids known mistakes)
- Consistent with other products (same patterns)
```

## Memory Updates

### After Each Task

Orchestrator updates agent memory with:

```json
{
  "task_id": "...",
  "product": "...",
  "started_at": "...",
  "completed_at": "...",
  "estimated_minutes": X,
  "actual_minutes": Y,
  "status": "success/failure",
  "challenges": ["..."],
  "solutions": ["..."],
  "artifacts": ["..."]
}
```

### When Pattern Discovered

If agent reports a new pattern (in AgentMessage):

```json
{
  "payload": {
    "context": {
      "notes": [
        "PATTERN: Discovered that X approach works better than Y for Z scenario"
      ]
    }
  }
}
```

Orchestrator:
1. Creates entry in company-knowledge.json
2. Adds to relevant agent's learned_patterns
3. Makes available to all future tasks

### Decision Logging

After CEO checkpoints, Orchestrator logs decision:

```json
{
  "id": "DEC-XXX",
  "date": "...",
  "product": "...",
  "context": "...",
  "decision": "...",
  "options_considered": [...],
  "rationale": "...",
  "outcome": "TBD"
}
```

Later, outcome is updated when impact is known.

## Memory Benefits

| Scenario | Without Memory | With Memory |
|----------|---------------|-------------|
| **New product setup** | Rediscover Prisma config each time | Apply known pattern instantly |
| **CSS issues** | Debug Tailwind each time | Check common_gotchas, apply fix |
| **Database design** | Forget to add indices | Checklist from common_mistakes |
| **Time estimation** | Always off by similar amount | Adjust based on estimated_vs_actual |
| **Architectural decisions** | Re-debate same tradeoffs | Reference decision-log for consistency |
| **Code patterns** | Inconsistent across products | Learned patterns applied uniformly |

## Memory Maintenance

### Periodic Review

Monthly (automated task):
- Analyze performance metrics
- Identify new patterns (>2 occurrences)
- Promote successful patterns to company knowledge
- Archive old patterns with low confidence
- Update anti-patterns based on failures

### Confidence Scoring

Patterns gain confidence as they're successfully applied:

```
confidence = success_rate * log(times_applied + 1)

Where:
- success_rate = 1.0 means always worked
- times_applied = how many times it's been used
- log dampens the impact of many applications

Levels:
- high: confidence >= 0.9
- medium: 0.6 <= confidence < 0.9
- low: confidence < 0.6
```

High confidence patterns are auto-applied.
Medium confidence patterns are suggested.
Low confidence patterns are available but not pushed.

## Privacy & Security

Memory does NOT contain:
- Actual code (only snippets)
- Sensitive data
- API keys or credentials
- Business secrets
- Customer data

Memory DOES contain:
- Technical patterns
- Process improvements
- Decision rationale
- Performance metrics
- Code structure patterns

## Future Enhancements

- **AI-Powered Pattern Detection**: Use LLM to analyze commits and suggest patterns
- **Cross-Company Learning**: Share anonymized patterns with other Claude Code instances
- **Visualization**: Dashboard showing most valuable patterns, agent improvements
- **Automated Onboarding**: New agents read memory to "get up to speed"
- **A/B Testing**: Test old approach vs new pattern, track success rates
