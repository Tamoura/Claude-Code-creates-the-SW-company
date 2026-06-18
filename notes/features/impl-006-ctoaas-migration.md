# IMPL-006: CTOaaS Initial Migration & Seed

## Summary
Initial Prisma migration for CTOaaS product, creating all 14 database tables,
14 enums, PostgreSQL extensions, custom indexes, and seeding 31 tech radar items.

## Database: ctoaas_dev / ctoaas_test
- PostgreSQL 15 on localhost:5432
- Extensions: uuid-ossp, vector (pgvector), pg_trgm

## Migrations Applied
1. `20260314034250_init` - Full schema: 14 tables, 14 enums, all indexes, foreign keys
2. `20260314034251_custom_indexes` - HNSW (vector), GIN (trigram), BRIN (time-series)

## Notes
- pgvector had to be compiled from source for PostgreSQL 15 (Homebrew installs for pg17/18)
- Prisma generates `CREATE EXTENSION "pgvector"` but actual PG extension name is `"vector"` -- fixed in migration SQL
- `prisma migrate dev` requires interactive mode; used `prisma migrate diff` + `prisma migrate deploy` workflow instead
- psql binary at: `/opt/homebrew/Cellar/postgresql@15/15.14/bin/psql`

## Custom Indexes
| Index | Type | Table | Purpose |
|-------|------|-------|---------|
| idx_knowledge_chunks_embedding | HNSW | knowledge_chunks | Vector similarity (RAG) |
| idx_messages_content_trgm | GIN | messages | Full-text search |
| idx_audit_logs_created_at_brin | BRIN | audit_logs | Time-series queries |

## Seed Data
- 31 tech radar items across 4 quadrants (Languages & Frameworks, Platforms & Infrastructure, Tools, Techniques)
- Idempotent via upsert on unique name
