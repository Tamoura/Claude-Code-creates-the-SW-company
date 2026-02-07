# Pulse - Data Engineer Notes (DATA-01)

## Task: DATA-01

**Branch**: feature/pulse/inception
**Status**: Complete
**Date**: 2026-02-07

## Deliverables

1. DATA-MODEL.md - Entity Relationship Diagram, table docs, index rationale
2. seed.ts - Idempotent seed script with realistic test data
3. MIGRATION-PLAN-initial.md - Growth projections, partitioning, archival
4. Package.json updates for @faker-js/faker

## Key Facts from Schema

- 15 tables (18 including summary count)
- 12 enums
- 50+ indexes (including BRIN for time-series)
- 5 triggers (updated_at auto-update)
- TEXT primary keys (CUID format)
- BRIN indexes on timestamp columns
- Partial indexes for common query patterns

## Schema Overview (from db-schema.sql)

### Core Entities
- users, teams, team_members
- repositories, commits, pull_requests, reviews, deployments
- coverage_reports, metric_snapshots, risk_snapshots
- notifications, notification_preferences, device_tokens
- team_invitations, refresh_tokens, audit_logs, job_state

### High-Growth Tables (need partitioning strategy)
- commits: ~500-2000/day per active repo
- metric_snapshots: ~9 metrics * repos * hourly = grows fast
- audit_logs: append-only, never deleted
- notifications: 30-day retention

## Decisions

- Seed script creates 3 users (admin, member, viewer)
- 2 teams with 3-5 repos each
- 90 days of historical commit data with realistic weekday/weekend patterns
- PR data with varying cycle times (1h to 5d)
- Deployment data for staging + production
- Using @faker-js/faker for realistic names/emails
