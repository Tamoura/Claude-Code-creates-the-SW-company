# Database State Verification Gate

**Inspired by**: FullStack-Agent (arXiv:2602.03798) — FullStack-Bench database testing methodology
**Quality Gate Position**: Runs as part of the Testing Gate (Gate 3), after unit and E2E tests

## Purpose

Verify that database state is correct after operations — not just that APIs return the right responses. This catches a class of bugs where the API response looks correct but the database has incorrect data (orphaned records, missing cascade deletes, wrong foreign key relationships, incorrect data types).

## The Problem This Solves

```
Current Testing:
  API test: POST /api/v1/users → 201 ✅ (response looks correct)
  But database: passwordHash stored in plaintext 💀 (nobody checked)

  API test: DELETE /api/v1/projects/1 → 200 ✅ (response says deleted)
  But database: 47 orphaned task records still exist 💀 (cascade not configured)

  API test: PUT /api/v1/users/1 → 200 ✅ (response shows updated email)
  But database: audit_log has no entry for this change 💀 (trigger missing)
```

## How It Works

### Snapshot-Based Verification

After each major operation (CRUD endpoint, migration, seed), take a database snapshot and compare against expected state.

```
Step 1: Capture baseline snapshot
├── Record table schemas (column names, types, constraints)
├── Record row counts per table
├── Record key relationships (foreign keys)
└── Store as JSON baseline

Step 2: Execute operation
├── Run the API endpoint or migration
└── Wait for completion

Step 3: Capture post-operation snapshot
├── Same schema + row count capture
└── Also capture first 5 rows of affected tables (for data verification)

Step 4: Compare against expected state
├── Schema changes match migration expectations
├── Row counts changed as expected (+1 for create, -1 for delete, same for update)
├── Foreign key relationships intact (no orphans)
├── Audit/log tables updated (if applicable)
├── Data values match expectations (spot check first 5 rows)
└── No unexpected side effects on unrelated tables

Step 5: Report
├── PASS: All assertions match
├── WARN: Minor discrepancies (e.g., updated_at timestamps slightly off)
└── FAIL: Data integrity issues found
```

### Database Verification Checks

#### 1. Schema Integrity

```sql
-- Verify all expected tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify columns match Prisma schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = '[table]'
ORDER BY ordinal_position;

-- Verify foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

#### 2. Data Integrity After Operations

```sql
-- After CREATE: Verify record exists with correct data
SELECT * FROM users WHERE id = '[created_id]';
-- Check: all fields match input, passwordHash is hashed (not plaintext), timestamps set

-- After UPDATE: Verify only target fields changed
SELECT * FROM users WHERE id = '[updated_id]';
-- Check: updated fields match new values, other fields unchanged, updated_at changed

-- After DELETE: Verify cascade behavior
SELECT COUNT(*) FROM projects WHERE owner_id = '[deleted_user_id]';
-- Check: should be 0 if cascade delete configured, or should be preserved if soft delete

-- Orphan detection
SELECT t.id FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
WHERE p.id IS NULL;
-- Check: should return 0 rows (no orphaned tasks)
```

#### 3. Audit Trail Verification

```sql
-- Verify audit log entry was created for sensitive operations
SELECT action, entity_type, entity_id, actor_id, created_at
FROM audit_logs
WHERE entity_type = 'user' AND entity_id = '[user_id]'
ORDER BY created_at DESC
LIMIT 1;
-- Check: action matches operation, actor matches authenticated user
```

### Snapshot Format

```json
{
  "timestamp": "2026-02-12T10:00:00Z",
  "product": "stablecoin-gateway",
  "operation": "POST /api/v1/users",
  "tables": {
    "users": {
      "row_count": 5,
      "schema": [
        { "column": "id", "type": "uuid", "nullable": false },
        { "column": "email", "type": "varchar", "nullable": false },
        { "column": "password_hash", "type": "varchar", "nullable": false }
      ],
      "sample_rows": [
        { "id": "uuid-1", "email": "test@example.com", "password_hash": "$2b$10$..." }
      ]
    },
    "audit_logs": {
      "row_count": 12,
      "latest_entry": {
        "action": "USER_CREATED",
        "entity_type": "user",
        "entity_id": "uuid-1"
      }
    }
  },
  "orphan_check": {
    "orphaned_records": 0,
    "tables_checked": ["tasks", "projects", "api_keys"]
  }
}
```

## Integration with Quality Gates

### In the Testing Gate (Gate 3)

Add as Step 2.5 (after integration tests, before E2E):

```
Step 1: Run Unit Tests → PASS/FAIL
Step 2: Run Integration Tests → PASS/FAIL
Step 2.5: Run Database State Verification → PASS/FAIL  ← NEW
Step 3: Run E2E Tests → PASS/FAIL
Step 4: Interactive Element Verification → PASS/FAIL
Step 5: Visual Verification → PASS/FAIL
```

### Pass Criteria

```
✅ PASS if:
- All expected tables exist with correct schemas
- Row counts match expectations after operations
- Zero orphaned records across all tables
- Foreign key constraints intact
- Audit trail entries present for all audited operations
- Password hashes are actually hashed (not plaintext)
- Sensitive data not stored in cleartext

⚠️ WARN if:
- Minor timestamp discrepancies
- Extra columns exist (not in Prisma schema)

❌ FAIL if:
- Missing tables or columns
- Orphaned records detected
- Foreign key violations
- Plaintext passwords or sensitive data
- Missing audit trail entries for sensitive operations
- Data type mismatches between Prisma schema and actual database
```

### Report Format

```markdown
## Database State Verification Report

**Product**: [product]
**Date**: [date]
**Status**: ✅ PASS / ❌ FAIL

### Schema Integrity
- Tables: 12/12 exist ✅
- Columns: All match Prisma schema ✅
- Foreign keys: 8/8 constraints valid ✅
- Indexes: All expected indexes present ✅

### Data Integrity
- Orphan check: 0 orphaned records ✅
- Cascade deletes: Working correctly ✅
- Audit trail: All sensitive operations logged ✅
- Password storage: All hashes use bcrypt ✅

### Post-Operation Verification
| Operation | Expected | Actual | Status |
|-----------|----------|--------|--------|
| Create user | +1 user row | +1 user row | ✅ |
| Create user | +1 audit_log | +1 audit_log | ✅ |
| Delete project | -1 project, -N tasks | -1 project, -3 tasks | ✅ |
```

## When to Run

1. **During development**: Backend Engineer runs after each migration or major CRUD implementation (part of Development-Oriented Testing)
2. **At Testing Gate**: QA Engineer runs as part of the comprehensive test suite
3. **Pre-production**: DevOps runs before production deployment
4. **Post-migration**: Automatically after any Prisma migration in CI
