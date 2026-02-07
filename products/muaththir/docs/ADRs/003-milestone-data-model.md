# ADR-003: Milestone Data Model and Seed Strategy

## Status

Accepted

## Context

Mu'aththir requires 240+ pre-defined developmental milestones across 6 dimensions and 4 age bands (10 milestones per dimension per age band). These milestones are the backbone of the milestone checklist feature (F-005) and contribute 40% of the radar chart score formula.

We need to decide:

1. **How milestone definitions are stored**: Static table vs JSON file vs code constants.
2. **How child progress is tracked**: Separate table vs embedded in child record.
3. **How mark/unmark history is preserved**: Separate history table vs JSON column.
4. **How seed data is loaded**: Prisma seed script vs SQL migration vs JSON fixtures.

## Decisions

### 1. Milestone Definitions: Prisma Model + Database Table

**Decision**: Store milestone definitions in a `milestone_definitions` database table, managed by Prisma.

**Rationale**:
- Definitions need to be queryable by dimension and age band for the milestone list endpoint.
- A database table allows efficient JOINs with the child progress table for computing completion percentages.
- Prisma migrations handle schema changes if we need to add fields later (e.g., `category`, `difficulty`).
- The `@@unique([dimension, ageBand, sortOrder])` constraint ensures no duplicate ordering.

**Why not JSON fixtures loaded at startup**: Loading 240+ records from a JSON file at application startup adds latency and makes the data unavailable for raw SQL queries. The database is the right place for data that needs to be queried.

**Why not code constants**: TypeScript constants cannot be joined with in SQL queries for completion percentage calculations. They would require loading all milestones into memory and computing progress in application code, which is less efficient than a SQL GROUP BY.

### 2. Child Progress: Separate `child_milestones` Junction Table

**Decision**: Track each child's milestone progress in a `child_milestones` table with a unique constraint on `(child_id, milestone_id)`.

**Schema**:
```prisma
model ChildMilestone {
  id              String    @id @default(cuid())
  childId         String    @map("child_id")
  milestoneId     String    @map("milestone_id")
  achieved        Boolean   @default(false)
  achievedAt      DateTime? @map("achieved_at")
  achievedHistory Json?     @map("achieved_history")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([childId, milestoneId])
}
```

**Rationale**:
- A junction table is the standard relational pattern for many-to-many relationships (children x milestones).
- The `@@unique([childId, milestoneId])` constraint enables UPSERT operations: if the row exists, update it; otherwise, create it.
- Rows are created lazily (on first mark) rather than eagerly (creating 240+ rows per child on profile creation). This keeps the table small for children whose parents only engage with a few dimensions.
- The `achieved` boolean + `achievedAt` timestamp provide the current state.
- Deleting a child cascades to delete all their milestone progress rows.

**Why not embed progress in the child record**: Storing progress as a JSON map on the child record (e.g., `{milestoneId: {achieved, achievedAt}}`) would prevent SQL JOINs for completion percentage calculations and would require loading the entire map for every milestone query.

### 3. Mark/Unmark History: JSON Column

**Decision**: Store mark/unmark history in a JSONB column (`achieved_history`) on the `child_milestones` table.

**Format**:
```json
[
  {
    "achievedAt": "2026-01-15T10:00:00Z",
    "unmarkedAt": "2026-01-20T14:30:00Z"
  },
  {
    "achievedAt": "2026-02-05T09:15:00Z",
    "unmarkedAt": null
  }
]
```

**Rationale**:
- The PRD (FR-027) requires that when a milestone is unmarked, "the original achievement date is preserved in history."
- A JSON array is the simplest way to store an unbounded list of mark/unmark events.
- The history is only ever read when a parent views the milestone detail (rare access pattern). It is not used in score calculations or aggregate queries.
- A separate `milestone_history` table would add a JOIN for a feature that is accessed infrequently and would triple the number of database writes for mark/unmark operations.

**Mark flow**:
1. UPSERT `child_milestones` with `achieved = true, achievedAt = NOW()`.
2. Append `{achievedAt: NOW(), unmarkedAt: null}` to `achieved_history` array.

**Unmark flow**:
1. UPDATE `child_milestones` with `achieved = false, achievedAt = null`.
2. Set `unmarkedAt = NOW()` on the last entry in `achieved_history`.

**Why not a separate history table**: The history is append-only and only used for display. A JSONB column avoids an extra table, extra JOINs, and extra rows. PostgreSQL JSONB is efficient for arrays of <100 elements, which is far more than any realistic mark/unmark cycle.

### 4. Seed Data: Prisma Seed Script with TypeScript Data File

**Decision**: Author milestone definitions in a TypeScript data file and load them via Prisma's `db seed` command.

**Structure**:
```
apps/api/prisma/
  +-- seed.ts                    # Main seed script
  +-- data/
      +-- milestones/
          +-- academic.ts        # Academic milestones for all 4 age bands
          +-- social-emotional.ts
          +-- behavioural.ts
          +-- aspirational.ts
          +-- islamic.ts
          +-- physical.ts
```

Each file exports an array of milestone definitions:

```typescript
// prisma/data/milestones/islamic.ts
import { Dimension, AgeBand } from '@prisma/client';

export const islamicMilestones = [
  {
    dimension: Dimension.islamic,
    ageBand: AgeBand.early_years,
    title: 'Knows the 5 pillars of Islam',
    description: 'Can name all five pillars: Shahada, Salah, Zakat, Sawm, Hajj.',
    guidance: 'Use a simple song or rhyme. Ask them to teach it to a sibling or toy.',
    sortOrder: 1,
  },
  // ... 9 more for early_years
  // ... 10 for primary
  // ... 10 for upper_primary
  // ... 10 for secondary
];
```

The seed script uses `prisma.milestoneDefinition.upsert()` with the unique constraint `(dimension, ageBand, sortOrder)` as the lookup key, ensuring idempotent re-runs.

**Rationale**:
- **TypeScript**: Type checking catches errors (wrong enum values, missing fields) before the data reaches the database.
- **Separate files per dimension**: Each file is ~100 lines (40 milestones with descriptions and guidance). Keeping them separate makes review and editing manageable.
- **Prisma seed**: The `npx prisma db seed` command is the standard Prisma mechanism. It integrates with `prisma migrate reset` (seed runs after migration reset).
- **Upsert**: Running the seed script multiple times does not create duplicates. New milestones are added; existing ones are updated if their text changes.

**Why not SQL migration**: SQL INSERT statements for 240+ records with multi-line text (titles, descriptions, guidance) are harder to review, lack type checking, and are more error-prone with escaping.

**Why not JSON fixtures**: JSON does not have comments, making it harder to organize and annotate the milestone data. TypeScript allows grouping by age band with comments and type safety.

### 5. Age Band Handling

**Decision**: Age band is always calculated from the child's `date_of_birth` at query time. It is never stored on the child record or the milestone progress record.

**Rationale**:
- A child's age band changes over time (on their birthday). Storing the age band would require a background job or trigger to update it.
- Calculating it on the fly is cheap (`differenceInYears` from date-fns) and always correct.
- When querying milestones for a child, the API calculates the age band from DOB and uses it to filter milestone definitions.
- Previous age band milestones remain accessible: the API can accept an optional `ageBand` query parameter to view milestones from a different age band. Completion status is preserved because progress is tracked by `milestone_id`, not by age band.

### 6. Milestone Count and Coverage

**Decision**: Launch with exactly 10 milestones per dimension per age band (240 total). Plan for expansion to 15-20 per category post-MVP based on user feedback.

**Coverage by dimension**:
- **Academic** (40): Reading, writing, math, science, study habits by age band
- **Social-Emotional** (40): Empathy, emotional regulation, friendship, communication by age band
- **Behavioural** (40): Routine, responsibility, screen time, impulse control by age band
- **Aspirational** (40): Goal-setting, perseverance, leadership, growth mindset by age band
- **Islamic** (40): Quran, salah, Islamic knowledge, akhlaq, ibadah by age band
- **Physical** (40): Motor skills, fitness, nutrition, sleep, sports by age band

**Content principles**:
- Non-judgmental language ("Can..." not "Should...")
- Age-appropriate expectations backed by general developmental literature
- Islamic milestones respect madhab diversity (no sectarian specifics)
- Guidance text is practical and actionable
- Not sourced from copyrighted assessment tools

## Consequences

### Positive

- Clean relational model with efficient SQL queries for completion percentages
- Idempotent seed script enables easy milestone content updates
- TypeScript data files provide type safety for 240+ records
- JSONB history column avoids table proliferation for an infrequently-accessed feature
- Lazy row creation keeps the child_milestones table small
- Age band calculation is always correct without background maintenance

### Negative

- 240 milestones must be authored before launch (significant content effort)
- JSONB history column is not queryable in aggregate (cannot easily ask "how many milestones were unmarked across all children?"). This is acceptable since such analytics are not in the MVP.
- Lazy row creation means the first milestone query for a child returns only `MilestoneDefinition` records without corresponding `ChildMilestone` rows. The API must handle this by LEFT JOINing and defaulting to `achieved = false`.

### Neutral

- Custom milestones (parent-authored) are explicitly out of scope for MVP. The data model could support them by adding a `parentId` nullable FK to `milestone_definitions`, but this is deferred to Phase 2.
- Milestone content will need review by Islamic educators and child development professionals before launch (noted in PRD risk register).

## References

- PRD FR-024 through FR-030: Milestone checklist requirements
- PRD Section 10: Milestone seed data dependency
- PRD Risk Register: Milestone content quality risk
- Addendum: Milestone Data Model section
