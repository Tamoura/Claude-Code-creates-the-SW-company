# Database State Verification Report

**Product**: taskflow
**Date**: 2026-02-12
**Status**: PASS (design-time verification)

## Schema Integrity

| Check | Expected | Verified | Status |
|-------|----------|----------|--------|
| User table exists | Yes | Prisma schema defines User | PASS |
| Task table exists | Yes | Prisma schema defines Task | PASS |
| User.id is UUID | UUID primary key | `@id @default(uuid())` | PASS |
| User.email is unique | Unique constraint | `@unique` | PASS |
| User.passwordHash exists | String field | Defined as `String` | PASS |
| Task.title max 200 | VarChar(200) | `@db.VarChar(200)` | PASS |
| Task.completed defaults false | Boolean default | `@default(false)` | PASS |
| Task.userId FK to User | Foreign key | `@relation(fields: [userId], references: [id])` | PASS |
| Cascade delete configured | onDelete: Cascade | `onDelete: Cascade` on Task→User | PASS |
| Index on Task.userId | Performance index | `@@index([userId])` | PASS |

## Data Integrity Verification Plan

### After User Registration (FR-001)
```sql
-- Verify user was created
SELECT id, email, "passwordHash" FROM "User" WHERE email = 'test@example.com';
-- Check: passwordHash starts with '$2b$' (bcrypt format, NOT plaintext)
-- Check: id is valid UUID format
```

### After Task Creation (FR-003)
```sql
-- Verify task was created with correct FK
SELECT t.id, t.title, t."userId", u.email
FROM "Task" t JOIN "User" u ON t."userId" = u.id
WHERE t.title = 'Test Task';
-- Check: userId matches authenticated user
-- Check: completed is false (default)
```

### After Task Deletion (FR-003)
```sql
-- Verify task was deleted
SELECT COUNT(*) FROM "Task" WHERE id = '<deleted-id>';
-- Check: returns 0

-- Verify no orphaned records
SELECT t.id FROM "Task" t
LEFT JOIN "User" u ON t."userId" = u.id
WHERE u.id IS NULL;
-- Check: returns 0 rows
```

### After User Deletion (Cascade Test)
```sql
-- Delete user
DELETE FROM "User" WHERE id = '<user-id>';

-- Verify cascade deleted all user's tasks
SELECT COUNT(*) FROM "Task" WHERE "userId" = '<user-id>';
-- Check: returns 0 (cascade worked)
```

### Audit Checks
| Check | Expected | Status |
|-------|----------|--------|
| Passwords stored as bcrypt hashes | Hash starts with `$2b$10$` | PASS (verified in crypto.ts) |
| No plaintext passwords in any column | No column stores raw password | PASS |
| JWT tokens not stored in database | No token column exists | PASS |
| Email uniqueness enforced at DB level | Unique constraint | PASS |

## Orphan Detection Plan

After each test run, execute:
```sql
-- Check for orphaned tasks (tasks without valid user)
SELECT t.id, t.title, t."userId"
FROM "Task" t
LEFT JOIN "User" u ON t."userId" = u.id
WHERE u.id IS NULL;
-- Expected: 0 rows
```

## Summary

- Schema matches Prisma specification: **PASS**
- Cascade delete configured correctly: **PASS**
- Password hashing enforced: **PASS**
- No sensitive data in plaintext: **PASS**
- Orphan detection query defined: **PASS**
- FK constraints and indexes present: **PASS**
