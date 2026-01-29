# Tech Management Helper - Data Model

## Overview

This document defines the data model for the Tech Management Helper GRC platform. The model supports:
- Multi-tenant organizations (future)
- Risk management with scoring
- Control tracking with framework mappings
- Asset inventory with CSV import
- Assessment workflow with approval
- 7-year audit log retention

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           TECH MANAGEMENT HELPER - DATA MODEL                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Organization   │         │      User        │         │     Session      │
├──────────────────┤         ├──────────────────┤         ├──────────────────┤
│ id: UUID (PK)    │◄───────┤│ id: UUID (PK)    │────────►│ id: UUID (PK)    │
│ name: String     │         │ email: String UK │         │ userId: UUID FK  │
│ slug: String UK  │         │ passwordHash: Str│         │ token: String    │
│ settings: JSONB  │         │ name: String     │         │ expiresAt: TS    │
│ createdAt: TS    │         │ role: Enum       │         │ ipAddress: String│
│ updatedAt: TS    │         │ orgId: UUID FK   │         │ userAgent: String│
└──────────────────┘         │ isActive: Bool   │         │ createdAt: TS    │
                             │ createdAt: TS    │         └──────────────────┘
                             │ updatedAt: TS    │
                             └────────┬─────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
           ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      Risk        │       │     Control      │       │      Asset       │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id: UUID (PK)    │       │ id: UUID (PK)    │       │ id: UUID (PK)    │
│ title: String    │       │ code: String UK  │       │ name: String     │
│ description: Text│       │ title: String    │       │ description: Text│
│ category: String │       │ description: Text│       │ type: Enum       │
│ likelihood: Int  │       │ category: String │       │ status: Enum     │
│ impact: Int      │       │ status: Enum     │       │ criticality: Enum│
│ status: Enum     │       │ implementation   │       │ location: String │
│ mitigationPlan:  │       │   Notes: Text    │       │ metadata: JSONB  │
│   Text           │       │ ownerId: UUID FK │       │ ownerId: UUID FK │
│ ownerId: UUID FK │       │ orgId: UUID FK   │       │ orgId: UUID FK   │
│ orgId: UUID FK   │       │ createdAt: TS    │       │ createdAt: TS    │
│ createdAt: TS    │       │ updatedAt: TS    │       │ updatedAt: TS    │
│ updatedAt: TS    │       └────────┬─────────┘       └────────┬─────────┘
└────────┬─────────┘                │                          │
         │                          │                          │
         │      ┌───────────────────┴───────────────────┐      │
         │      │                                       │      │
         │      ▼                                       ▼      │
         │   ┌──────────────────┐           ┌──────────────────┐
         │   │  ControlFramework│           │   Assessment     │
         │   │     Mapping      │           ├──────────────────┤
         │   ├──────────────────┤           │ id: UUID (PK)    │
         │   │ id: UUID (PK)    │           │ controlId: FK    │
         │   │ controlId: FK    │           │ assessorId: FK   │
         │   │ frameworkId: FK  │           │ status: Enum     │
         │   │ referenceId: Str │           │ effectiveness    │
         │   │   (e.g. PR.AC-1) │           │   Rating: Int    │
         │   │ createdAt: TS    │           │ findings: Text   │
         │   └────────┬─────────┘           │ recommendations  │
         │            │                     │ evidence: JSONB  │
         │            │                     │ assessmentDate   │
         │            │                     │ nextReviewDate   │
         │            │                     │ approverId: FK   │
         │            │                     │ approvalDate: TS │
         │            │                     │ approvalComments │
         │            │                     │ orgId: UUID FK   │
         │            │                     │ createdAt: TS    │
         │            │                     │ updatedAt: TS    │
         │            │                     └──────────────────┘
         │            │
         │            ▼
         │   ┌──────────────────┐
         │   │    Framework     │
         │   ├──────────────────┤
         │   │ id: UUID (PK)    │
         │   │ name: String     │
         │   │ version: String  │
         │   │ type: Enum       │
         │   │ description: Text│
         │   │ publishedDate    │
         │   │ data: JSONB      │
         │   │   (categories,   │
         │   │    subcategories)│
         │   │ createdAt: TS    │
         │   └──────────────────┘
         │
         │
         │   ┌──────────────────┐       ┌──────────────────┐
         │   │   RiskControl    │       │    RiskAsset     │
         │   │  (Join Table)    │       │  (Join Table)    │
         │   ├──────────────────┤       ├──────────────────┤
         └──►│ riskId: UUID FK  │       │ riskId: UUID FK  │◄─── (from Risk)
             │ controlId: FK    │       │ assetId: UUID FK │◄─── (from Asset)
             │ createdAt: TS    │       │ createdAt: TS    │
             └──────────────────┘       └──────────────────┘


┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                   AUDIT LOG (Partitioned)                                │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              AuditLog                                             │   │
│  ├──────────────────────────────────────────────────────────────────────────────────┤   │
│  │ id: UUID (PK)                                                                     │   │
│  │ timestamp: TIMESTAMP NOT NULL (Partition Key)                                     │   │
│  │ userId: UUID FK (nullable for system events)                                      │   │
│  │ action: Enum (CREATE, UPDATE, DELETE, READ, EXPORT)                              │   │
│  │ entityType: String (Risk, Control, Asset, Assessment, User)                      │   │
│  │ entityId: UUID                                                                    │   │
│  │ oldValue: JSONB                                                                   │   │
│  │ newValue: JSONB                                                                   │   │
│  │ ipAddress: INET                                                                   │   │
│  │ userAgent: String                                                                 │   │
│  │ metadata: JSONB (extra context)                                                   │   │
│  │ orgId: UUID FK                                                                    │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  Partitions: audit_log_2024, audit_log_2025, ... (one per year, 7-year retention)       │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

## Prisma Schema

```prisma
// This is your Prisma schema file
// Learn more: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== ENUMS ====================

enum Role {
  ADMIN
  MANAGER
  ANALYST
  VIEWER
}

enum RiskStatus {
  IDENTIFIED
  ASSESSED
  MITIGATING
  ACCEPTED
  CLOSED
}

enum ControlStatus {
  NOT_IMPLEMENTED
  PARTIALLY_IMPLEMENTED
  IMPLEMENTED
  NOT_APPLICABLE
}

enum AssetType {
  HARDWARE
  SOFTWARE
  DATA
  NETWORK
  PERSONNEL
  FACILITY
}

enum AssetStatus {
  ACTIVE
  INACTIVE
  DECOMMISSIONED
}

enum Criticality {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum AssessmentStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
}

enum FrameworkType {
  NIST_CSF
  ISO_27001
  COBIT
  IT4IT
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  READ
  EXPORT
}

// ==================== ORGANIZATION ====================

model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  settings  Json?    @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  users       User[]
  risks       Risk[]
  controls    Control[]
  assets      Asset[]
  assessments Assessment[]
  auditLogs   AuditLog[]

  @@map("organizations")
}

// ==================== USER & AUTH ====================

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(VIEWER)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Organization
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  // Relations
  sessions              Session[]
  ownedRisks            Risk[]       @relation("RiskOwner")
  ownedControls         Control[]    @relation("ControlOwner")
  ownedAssets           Asset[]      @relation("AssetOwner")
  assessments           Assessment[] @relation("Assessor")
  approvedAssessments   Assessment[] @relation("Approver")
  auditLogs             AuditLog[]

  @@index([organizationId])
  @@index([email])
  @@map("users")
}

model Session {
  id        String   @id @default(uuid())
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  // Relations
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
  @@map("sessions")
}

// ==================== RISK ====================

model Risk {
  id             String     @id @default(uuid())
  title          String
  description    String
  category       String
  likelihood     Int        @db.SmallInt // 1-5
  impact         Int        @db.SmallInt // 1-5
  status         RiskStatus @default(IDENTIFIED)
  mitigationPlan String?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  // Owner
  ownerId String?
  owner   User?   @relation("RiskOwner", fields: [ownerId], references: [id])

  // Organization
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  // Relations (many-to-many)
  controls RiskControl[]
  assets   RiskAsset[]

  @@index([organizationId])
  @@index([status])
  @@index([category])
  @@map("risks")
}

model RiskControl {
  riskId    String
  controlId String
  createdAt DateTime @default(now())

  risk    Risk    @relation(fields: [riskId], references: [id], onDelete: Cascade)
  control Control @relation(fields: [controlId], references: [id], onDelete: Cascade)

  @@id([riskId, controlId])
  @@map("risk_controls")
}

model RiskAsset {
  riskId    String
  assetId   String
  createdAt DateTime @default(now())

  risk  Risk  @relation(fields: [riskId], references: [id], onDelete: Cascade)
  asset Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@id([riskId, assetId])
  @@map("risk_assets")
}

// ==================== CONTROL ====================

model Control {
  id                  String        @id @default(uuid())
  code                String        @unique
  title               String
  description         String
  category            String
  status              ControlStatus @default(NOT_IMPLEMENTED)
  implementationNotes String?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  // Owner
  ownerId String?
  owner   User?   @relation("ControlOwner", fields: [ownerId], references: [id])

  // Organization
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  // Relations
  risks              RiskControl[]
  frameworkMappings  ControlFrameworkMapping[]
  assessments        Assessment[]

  @@index([organizationId])
  @@index([code])
  @@index([status])
  @@index([category])
  @@map("controls")
}

model ControlFrameworkMapping {
  id          String   @id @default(uuid())
  referenceId String   // Framework-specific ID (e.g., "PR.AC-1", "A.5.1.1")
  createdAt   DateTime @default(now())

  // Relations
  controlId   String
  control     Control   @relation(fields: [controlId], references: [id], onDelete: Cascade)
  frameworkId String
  framework   Framework @relation(fields: [frameworkId], references: [id])

  @@unique([controlId, frameworkId, referenceId])
  @@index([frameworkId])
  @@map("control_framework_mappings")
}

// ==================== ASSET ====================

model Asset {
  id          String      @id @default(uuid())
  name        String
  description String?
  type        AssetType
  status      AssetStatus @default(ACTIVE)
  criticality Criticality
  location    String?
  metadata    Json?       @default("{}")
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  // Owner
  ownerId String?
  owner   User?   @relation("AssetOwner", fields: [ownerId], references: [id])

  // Organization
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  // Relations
  risks RiskAsset[]

  @@index([organizationId])
  @@index([type])
  @@index([status])
  @@index([criticality])
  @@index([name])
  @@map("assets")
}

// ==================== ASSESSMENT ====================

model Assessment {
  id                  String           @id @default(uuid())
  status              AssessmentStatus @default(DRAFT)
  effectivenessRating Int              @db.SmallInt // 1-5
  findings            String
  recommendations     String?
  evidence            Json?            @default("[]") // Array of file URLs
  assessmentDate      DateTime         @db.Date
  nextReviewDate      DateTime?        @db.Date
  approvalDate        DateTime?
  approvalComments    String?
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  // Control being assessed
  controlId String
  control   Control @relation(fields: [controlId], references: [id])

  // Assessor (who performed the assessment)
  assessorId String
  assessor   User   @relation("Assessor", fields: [assessorId], references: [id])

  // Approver (manager who approved/rejected)
  approverId String?
  approver   User?   @relation("Approver", fields: [approverId], references: [id])

  // Organization
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId])
  @@index([controlId])
  @@index([status])
  @@index([assessmentDate])
  @@map("assessments")
}

// ==================== FRAMEWORK ====================

model Framework {
  id            String        @id @default(uuid())
  name          String
  version       String
  type          FrameworkType
  description   String?
  publishedDate DateTime?     @db.Date
  data          Json          // Categories, subcategories, requirements
  createdAt     DateTime      @default(now())

  // Relations
  controlMappings ControlFrameworkMapping[]

  @@unique([type, version])
  @@map("frameworks")
}

// ==================== AUDIT LOG ====================
// Note: In production, this table should be partitioned by timestamp
// for efficient 7-year retention queries

model AuditLog {
  id         String      @id @default(uuid())
  timestamp  DateTime    @default(now())
  action     AuditAction
  entityType String
  entityId   String?
  oldValue   Json?
  newValue   Json?
  ipAddress  String?
  userAgent  String?
  metadata   Json?       @default("{}")

  // User who performed the action (nullable for system events)
  userId String?
  user   User?   @relation(fields: [userId], references: [id])

  // Organization
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId, timestamp])
  @@index([userId, timestamp])
  @@index([entityType, entityId])
  @@index([timestamp])
  @@map("audit_logs")
}
```

## Key Design Decisions

### 1. Organization Multi-Tenancy

All entities include an `organizationId` foreign key for future multi-tenant support. This allows:
- Data isolation between organizations
- Row-level security potential
- Easy tenant filtering in queries

### 2. Risk Scoring

Risk score is calculated as `likelihood x impact` (1-25 scale):
- **Low**: 1-4
- **Medium**: 5-9
- **High**: 10-15
- **Critical**: 16-25

The score is computed rather than stored to avoid data consistency issues.

### 3. Control Framework Mapping

Controls can map to multiple frameworks simultaneously:
- `ControlFrameworkMapping` junction table
- `referenceId` stores the framework-specific identifier
- Enables cross-framework compliance reporting

### 4. Asset Metadata

Assets use a JSONB `metadata` field for flexible attributes:
```json
{
  "serialNumber": "SN12345",
  "purchaseDate": "2024-01-15",
  "vendor": "Dell",
  "warranty": "2027-01-15"
}
```

### 5. Assessment Workflow

Assessment status flow:
```
DRAFT --> SUBMITTED --> APPROVED
                   \--> REJECTED (back to DRAFT)
```

### 6. Framework Data Structure

Framework `data` JSONB stores hierarchical structure:
```json
{
  "categories": [
    {
      "id": "ID",
      "name": "Identify",
      "subcategories": [
        {
          "id": "ID.AM",
          "name": "Asset Management",
          "controls": [
            {
              "id": "ID.AM-1",
              "name": "Physical devices inventory",
              "description": "..."
            }
          ]
        }
      ]
    }
  ]
}
```

### 7. Audit Log Partitioning

For 7-year retention with efficient queries:
```sql
-- Create partitioned table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  ...
) PARTITION BY RANGE (timestamp);

-- Create yearly partitions
CREATE TABLE audit_logs_2024 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE audit_logs_2025 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
-- ... etc for 7 years

-- Drop old partitions
DROP TABLE audit_logs_2017;
```

## Indexes

Performance-critical indexes:

| Table | Index | Purpose |
|-------|-------|---------|
| users | email | Login lookup |
| risks | organizationId, status | Dashboard queries |
| controls | organizationId, code | Control lookup |
| assets | organizationId, type, criticality | Inventory filtering |
| assessments | controlId, status | Assessment workflow |
| audit_logs | timestamp, organizationId | Audit queries |
| audit_logs | entityType, entityId | Entity history |

## Data Relationships Summary

| Relationship | Type | Description |
|--------------|------|-------------|
| User -> Organization | Many-to-One | Users belong to one org |
| Risk -> User (owner) | Many-to-One | Optional risk owner |
| Risk -> Control | Many-to-Many | Risks mitigated by controls |
| Risk -> Asset | Many-to-Many | Risks affecting assets |
| Control -> User (owner) | Many-to-One | Optional control owner |
| Control -> Framework | Many-to-Many | Control mapped to frameworks |
| Control -> Assessment | One-to-Many | Control assessment history |
| Assessment -> User (assessor) | Many-to-One | Who assessed |
| Assessment -> User (approver) | Many-to-One | Who approved |
| Asset -> User (owner) | Many-to-One | Asset owner |
| AuditLog -> User | Many-to-One | Who performed action |

## Seed Data

The following framework data will be seeded:

1. **NIST CSF 2.0** - 6 functions, 22 categories, 108 subcategories
2. **ISO 27001:2022** - 4 clauses, 93 controls
3. **COBIT 2019** - 5 domains, 40 objectives
4. **IT4IT 2.1** - 4 value streams, 15 functional components

---

*Created by*: Architect Agent
*Date*: 2026-01-26
