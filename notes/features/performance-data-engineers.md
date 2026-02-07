# New Agents: Performance Engineer & Data Engineer

## Why
- Performance gate had no dedicated agent to own it
- Database work was handled by backend engineer without
  specialization in migrations, indexing, and ETL

## Performance Engineer
- Owns the performance quality gate
- Specializes in: Lighthouse, bundle analysis, load testing,
  Core Web Vitals, database query optimization, caching
- Tools: k6, clinic.js, webpack-bundle-analyzer, EXPLAIN ANALYZE
- Deliverables: audit reports, load test reports, benchmark scripts

## Data Engineer
- Owns database schema design and migration safety
- Specializes in: Prisma schemas, safe migrations (3-step for
  breaking changes), ETL pipelines, data quality, backup/recovery
- Tools: PostgreSQL, Prisma Migrate, pg_stat_statements, pgBadger
- Deliverables: DATA-MODEL.md, migration plans, seed scripts

## Files Created (per agent)
- `.claude/agents/{agent}.md` — full definition (~400 lines each)
- `.claude/agents/briefs/{agent}.md` — compact brief (~55 lines each)
- `.claude/memory/agent-experiences/{agent}.json` — experience file

## Also Updated
- `.claude/CLAUDE.md` — agent hierarchy now lists all 16 agents
- `.claude/memory/metrics/agent-performance.json` — re-aggregated
