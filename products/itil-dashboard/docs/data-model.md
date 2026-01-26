# ITIL Dashboard - Data Model

## 1. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         USER MANAGEMENT                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                     │
│   ┌──────────────────┐          ┌──────────────────┐          ┌──────────────────────┐            │
│   │      User        │          │      Role        │          │    RefreshToken      │            │
│   ├──────────────────┤          ├──────────────────┤          ├──────────────────────┤            │
│   │ id: UUID (PK)    │          │ id: UUID (PK)    │          │ id: UUID (PK)        │            │
│   │ email: String    │──────────│ name: String     │          │ token: String        │            │
│   │ passwordHash     │   N:1    │ description      │          │ userId: UUID (FK)    │────────┐   │
│   │ firstName        │          │ level: Int       │          │ expiresAt: DateTime  │        │   │
│   │ lastName         │          │ permissions[]    │          │ revokedAt: DateTime? │        │   │
│   │ roleId: UUID(FK) │◄─────────│ createdAt        │          │ createdAt: DateTime  │        │   │
│   │ status: Status   │          │ updatedAt        │          └──────────────────────┘        │   │
│   │ failedLogins     │          └──────────────────┘                                          │   │
│   │ lockedUntil      │                                                                        │   │
│   │ createdAt        │◄───────────────────────────────────────────────────────────────────────┘   │
│   │ updatedAt        │                                                                            │
│   │ deletedAt        │          ┌──────────────────────┐      ┌──────────────────────┐            │
│   └──────────────────┘          │ PasswordResetToken   │      │    AuthAuditLog      │            │
│           │                     ├──────────────────────┤      ├──────────────────────┤            │
│           │                     │ id: UUID (PK)        │      │ id: UUID (PK)        │            │
│           │ 1:N                 │ token: String        │      │ userId: UUID? (FK)   │            │
│           └────────────────────►│ userId: UUID (FK)    │      │ event: AuthEvent     │            │
│           │                     │ expiresAt: DateTime  │      │ ipAddress: String    │            │
│           │                     │ usedAt: DateTime?    │      │ userAgent: String    │            │
│           └────────────────────►│ createdAt: DateTime  │      │ success: Boolean     │            │
│                                 └──────────────────────┘      │ failureReason        │            │
│                                                               │ timestamp: DateTime  │            │
│                                                               └──────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     INCIDENT MANAGEMENT                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                     │
│   ┌──────────────────────┐                              ┌──────────────────────┐                   │
│   │      Incident        │                              │   IncidentHistory    │                   │
│   ├──────────────────────┤                              ├──────────────────────┤                   │
│   │ id: UUID (PK)        │──────── 1:N ────────────────►│ id: UUID (PK)        │                   │
│   │ displayId: String    │                              │ incidentId: UUID(FK) │                   │
│   │ title: String        │                              │ fieldName: String    │                   │
│   │ description: Text    │                              │ oldValue: Json?      │                   │
│   │ status: IncStatus    │                              │ newValue: Json?      │                   │
│   │ priority: Priority   │                              │ changedById: UUID(FK)│                   │
│   │ impact: Impact       │                              │ changedAt: DateTime  │                   │
│   │ urgency: Urgency     │                              └──────────────────────┘                   │
│   │ categoryId: UUID(FK) │◄─────────────────────┐                                                  │
│   │ affectedUserId: UUID?│                      │       ┌──────────────────────┐                   │
│   │ reportedById: UUID   │                      │       │      SLAPause        │                   │
│   │ assigneeId: UUID?    │                      │       ├──────────────────────┤                   │
│   │ slaConfigId: UUID?   │──────── 1:N ────────────────►│ id: UUID (PK)        │                   │
│   │ responseSlaDue       │                      │       │ incidentId: UUID(FK) │                   │
│   │ resolutionSlaDue     │                      │       │ pausedAt: DateTime   │                   │
│   │ responseSlaStatus    │                      │       │ resumedAt: DateTime? │                   │
│   │ resolutionSlaStatus  │                      │       │ reason: String       │                   │
│   │ firstResponseAt      │                      │       └──────────────────────┘                   │
│   │ resolvedAt           │                      │                                                  │
│   │ closedAt             │                      │       ┌──────────────────────┐                   │
│   │ resolutionNotes      │                      │       │  IncidentAttachment  │                   │
│   │ createdAt            │                      │       ├──────────────────────┤                   │
│   │ updatedAt            │──────── 1:N ────────────────►│ id: UUID (PK)        │                   │
│   │ deletedAt            │                              │ incidentId: UUID(FK) │                   │
│   └──────────────────────┘                              │ fileName: String     │                   │
│           │                                             │ fileSize: Int        │                   │
│           │ N:1                                         │ mimeType: String     │                   │
│           ▼                                             │ storageKey: String   │                   │
│   ┌──────────────────────┐                              │ uploadedById: UUID   │                   │
│   │      Category        │                              │ createdAt: DateTime  │                   │
│   ├──────────────────────┤                              └──────────────────────┘                   │
│   │ id: UUID (PK)        │                                                                         │
│   │ name: String         │◄───┐                                                                    │
│   │ description          │    │ Self-referential                                                   │
│   │ type: CategoryType   │    │ (parent-child)                                                     │
│   │ parentId: UUID? (FK) │────┘                                                                    │
│   │ isActive: Boolean    │                                                                         │
│   │ createdAt            │                                                                         │
│   │ updatedAt            │                                                                         │
│   └──────────────────────┘                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      PROBLEM MANAGEMENT                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                     │
│   ┌──────────────────────┐                              ┌──────────────────────┐                   │
│   │      Problem         │                              │   ProblemIncident    │                   │
│   ├──────────────────────┤                              ├──────────────────────┤                   │
│   │ id: UUID (PK)        │──────── 1:N ────────────────►│ id: UUID (PK)        │                   │
│   │ displayId: String    │                              │ problemId: UUID (FK) │                   │
│   │ title: String        │                              │ incidentId: UUID(FK) │◄──── Incident     │
│   │ description: Text    │                              │ linkedAt: DateTime   │                   │
│   │ status: ProbStatus   │                              │ linkedById: UUID(FK) │                   │
│   │ priority: Priority   │                              └──────────────────────┘                   │
│   │ categoryId: UUID(FK) │                                                                         │
│   │ rootCause: Text?     │                              ┌──────────────────────┐                   │
│   │ workaround: Text?    │                              │     KnownError       │                   │
│   │ permanentFix: Text?  │──────── 1:1? ───────────────►├──────────────────────┤                   │
│   │ knownErrorId: UUID?  │                              │ id: UUID (PK)        │                   │
│   │ assigneeId: UUID?    │                              │ problemId: UUID (FK) │                   │
│   │ resolvedAt           │                              │ title: String        │                   │
│   │ closedAt             │                              │ description: Text    │                   │
│   │ createdById: UUID    │                              │ workaround: Text     │                   │
│   │ createdAt            │                              │ affectedSystems      │                   │
│   │ updatedAt            │                              │ isActive: Boolean    │                   │
│   │ deletedAt            │                              │ createdAt            │                   │
│   └──────────────────────┘                              │ updatedAt            │                   │
│                                                         └──────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      CHANGE MANAGEMENT                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                     │
│   ┌──────────────────────┐                              ┌──────────────────────┐                   │
│   │       Change         │                              │   ChangeApproval     │                   │
│   ├──────────────────────┤                              ├──────────────────────┤                   │
│   │ id: UUID (PK)        │──────── 1:N ────────────────►│ id: UUID (PK)        │                   │
│   │ displayId: String    │                              │ changeId: UUID (FK)  │                   │
│   │ title: String        │                              │ approverId: UUID(FK) │                   │
│   │ description: Text    │                              │ decision: Decision   │                   │
│   │ status: ChgStatus    │                              │ comments: Text?      │                   │
│   │ type: ChangeType     │                              │ decidedAt: DateTime  │                   │
│   │ priority: Priority   │                              └──────────────────────┘                   │
│   │ risk: RiskLevel      │                                                                         │
│   │ impact: Text         │                              ┌──────────────────────┐                   │
│   │ categoryId: UUID(FK) │                              │    ChangeHistory     │                   │
│   │ requesterId: UUID    │                              ├──────────────────────┤                   │
│   │ assigneeId: UUID?    │──────── 1:N ────────────────►│ id: UUID (PK)        │                   │
│   │ implementationPlan   │                              │ changeId: UUID (FK)  │                   │
│   │ rollbackPlan         │                              │ fieldName: String    │                   │
│   │ testPlan             │                              │ oldValue: Json?      │                   │
│   │ scheduledStartAt     │                              │ newValue: Json?      │                   │
│   │ scheduledEndAt       │                              │ changedById: UUID    │                   │
│   │ actualStartAt        │                              │ changedAt: DateTime  │                   │
│   │ actualEndAt          │                              └──────────────────────┘                   │
│   │ reviewNotes          │                                                                         │
│   │ linkedProblemId      │◄──── Problem (optional)                                                 │
│   │ createdAt            │                                                                         │
│   │ updatedAt            │                                                                         │
│   │ deletedAt            │                                                                         │
│   └──────────────────────┘                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SERVICE REQUEST MANAGEMENT                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                     │
│   ┌──────────────────────┐                              ┌──────────────────────┐                   │
│   │   ServiceRequest     │                              │ ServiceCatalogItem   │                   │
│   ├──────────────────────┤                              ├──────────────────────┤                   │
│   │ id: UUID (PK)        │◄─────── N:1 ────────────────│ id: UUID (PK)        │                   │
│   │ displayId: String    │                              │ name: String         │                   │
│   │ catalogItemId: UUID  │                              │ description: Text    │                   │
│   │ requesterId: UUID    │                              │ categoryId: UUID(FK) │                   │
│   │ status: ReqStatus    │                              │ fulfillmentTime: Int │                   │
│   │ priority: Priority   │                              │ requiresApproval     │                   │
│   │ fulfillerId: UUID?   │                              │ formSchema: Json     │                   │
│   │ formData: Json       │                              │ isActive: Boolean    │                   │
│   │ notes: Text?         │                              │ createdAt            │                   │
│   │ fulfilledAt          │                              │ updatedAt            │                   │
│   │ closedAt             │                              └──────────────────────┘                   │
│   │ createdAt            │                                                                         │
│   │ updatedAt            │          ┌──────────────────────┐                                       │
│   │ deletedAt            │          │   RequestApproval    │                                       │
│   └──────────────────────┘          ├──────────────────────┤                                       │
│           │                         │ id: UUID (PK)        │                                       │
│           └──────── 1:N ───────────►│ requestId: UUID (FK) │                                       │
│                                     │ approverId: UUID(FK) │                                       │
│                                     │ decision: Decision   │                                       │
│                                     │ comments: Text?      │                                       │
│                                     │ decidedAt: DateTime  │                                       │
│                                     └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    KNOWLEDGE MANAGEMENT                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                     │
│   ┌──────────────────────┐                              ┌──────────────────────┐                   │
│   │  KnowledgeArticle    │                              │   ArticleVersion     │                   │
│   ├──────────────────────┤                              ├──────────────────────┤                   │
│   │ id: UUID (PK)        │──────── 1:N ────────────────►│ id: UUID (PK)        │                   │
│   │ displayId: String    │                              │ articleId: UUID (FK) │                   │
│   │ title: String        │                              │ versionNumber: Int   │                   │
│   │ content: Text        │                              │ title: String        │                   │
│   │ summary: Text?       │                              │ content: Text        │                   │
│   │ status: KBStatus     │                              │ changeNotes: String? │                   │
│   │ categoryId: UUID(FK) │                              │ createdById: UUID    │                   │
│   │ authorId: UUID       │                              │ createdAt: DateTime  │                   │
│   │ keywords: String[]   │                              └──────────────────────┘                   │
│   │ viewCount: Int       │                                                                         │
│   │ version: Int         │          ┌──────────────────────┐                                       │
│   │ publishedAt          │          │   ArticleRating      │                                       │
│   │ createdAt            │          ├──────────────────────┤                                       │
│   │ updatedAt            │──────────│ id: UUID (PK)        │                                       │
│   │ deletedAt            │   1:N    │ articleId: UUID (FK) │                                       │
│   └──────────────────────┘   ──────►│ userId: UUID (FK)    │                                       │
│                                     │ rating: Int (1-5)    │                                       │
│                                     │ comment: Text?       │                                       │
│                                     │ createdAt: DateTime  │                                       │
│                                     └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      CONFIGURATION & AUDIT                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                     │
│   ┌──────────────────────┐          ┌──────────────────────┐      ┌──────────────────────┐        │
│   │      SLAConfig       │          │       Holiday        │      │      AuditLog        │        │
│   ├──────────────────────┤          ├──────────────────────┤      ├──────────────────────┤        │
│   │ id: UUID (PK)        │──── 1:N ─│ id: UUID (PK)        │      │ id: UUID (PK)        │        │
│   │ name: String         │          │ slaConfigId: UUID(FK)│      │ entityType: String   │        │
│   │ businessStartMins    │          │ name: String         │      │ entityId: UUID       │        │
│   │ businessEndMins      │          │ date: Date           │      │ action: AuditAction  │        │
│   │ workingDays: Int[]   │          │ createdAt            │      │ userId: UUID (FK)    │        │
│   │ timezone: String     │          └──────────────────────┘      │ oldValues: Json?     │        │
│   │ p1ResponseMins       │                                        │ newValues: Json?     │        │
│   │ p1ResolutionMins     │                                        │ ipAddress: String?   │        │
│   │ p2ResponseMins       │                                        │ timestamp: DateTime  │        │
│   │ p2ResolutionMins     │                                        └──────────────────────┘        │
│   │ p3ResponseMins       │                                                                        │
│   │ p3ResolutionMins     │          ┌──────────────────────┐                                      │
│   │ p4ResponseMins       │          │     IdSequence       │                                      │
│   │ p4ResolutionMins     │          ├──────────────────────┤                                      │
│   │ createdAt            │          │ id: UUID (PK)        │                                      │
│   │ updatedAt            │          │ prefix: String       │  (INC, PRB, CHG, REQ, KB)            │
│   │                      │          │ currentValue: Int    │                                      │
│   └──────────────────────┘          │ updatedAt            │                                      │
│                                     └──────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Prisma Schema

```prisma
// This is your Prisma schema file
// Learn more at: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// ENUMS
// ============================================================================

enum UserStatus {
  ACTIVE
  INACTIVE
  LOCKED
}

enum AuthEvent {
  LOGIN
  LOGOUT
  LOGIN_FAILED
  PASSWORD_RESET_REQUESTED
  PASSWORD_RESET_COMPLETED
  TOKEN_REFRESHED
  ACCOUNT_LOCKED
  ACCOUNT_UNLOCKED
}

enum IncidentStatus {
  NEW
  IN_PROGRESS
  PENDING
  ON_HOLD
  RESOLVED
  CLOSED
}

enum ProblemStatus {
  NEW
  UNDER_INVESTIGATION
  KNOWN_ERROR
  RESOLVED
  CLOSED
}

enum ChangeStatus {
  DRAFT
  SUBMITTED
  PENDING_APPROVAL
  APPROVED
  REJECTED
  SCHEDULED
  IMPLEMENTING
  COMPLETED
  FAILED
  CLOSED
}

enum ChangeType {
  STANDARD
  NORMAL
  EMERGENCY
}

enum RequestStatus {
  SUBMITTED
  PENDING_APPROVAL
  APPROVED
  REJECTED
  FULFILLING
  COMPLETED
  CLOSED
}

enum KBStatus {
  DRAFT
  IN_REVIEW
  PUBLISHED
  ARCHIVED
}

enum Priority {
  P1
  P2
  P3
  P4
}

enum Impact {
  HIGH
  MEDIUM
  LOW
}

enum Urgency {
  HIGH
  MEDIUM
  LOW
}

enum RiskLevel {
  HIGH
  MEDIUM
  LOW
}

enum SLAStatus {
  ON_TRACK
  AT_RISK
  BREACHED
  MET
  PAUSED
}

enum ApprovalDecision {
  APPROVED
  REJECTED
  PENDING
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  STATUS_CHANGE
}

enum CategoryType {
  INCIDENT
  PROBLEM
  CHANGE
  REQUEST
  KNOWLEDGE
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

model User {
  id            String     @id @default(uuid())
  email         String     @unique
  passwordHash  String
  firstName     String
  lastName      String
  roleId        String
  role          Role       @relation(fields: [roleId], references: [id])
  status        UserStatus @default(ACTIVE)
  failedLogins  Int        @default(0)
  lockedUntil   DateTime?
  lastLoginAt   DateTime?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  deletedAt     DateTime?

  // Relations
  refreshTokens        RefreshToken[]
  passwordResetTokens  PasswordResetToken[]
  authAuditLogs        AuthAuditLog[]

  // Incidents
  reportedIncidents    Incident[]          @relation("IncidentReporter")
  assignedIncidents    Incident[]          @relation("IncidentAssignee")
  affectedIncidents    Incident[]          @relation("IncidentAffectedUser")

  // Problems
  createdProblems      Problem[]           @relation("ProblemCreator")
  assignedProblems     Problem[]           @relation("ProblemAssignee")

  // Changes
  requestedChanges     Change[]            @relation("ChangeRequester")
  assignedChanges      Change[]            @relation("ChangeAssignee")
  changeApprovals      ChangeApproval[]

  // Service Requests
  requestedServices    ServiceRequest[]    @relation("ServiceRequester")
  fulfilledServices    ServiceRequest[]    @relation("ServiceFulfiller")
  requestApprovals     RequestApproval[]

  // Knowledge
  authoredArticles     KnowledgeArticle[]
  articleRatings       ArticleRating[]

  // Audit
  auditLogs            AuditLog[]

  @@index([email])
  @@index([status])
  @@index([roleId])
}

model Role {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  level       Int      @default(1)  // Admin=3, Manager=2, Operator=1
  permissions String[] @default([])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       User[]
}

model RefreshToken {
  id        String    @id @default(uuid())
  token     String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  @@index([token])
  @@index([userId])
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  token     String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([token])
  @@index([userId])
}

model AuthAuditLog {
  id            String    @id @default(uuid())
  userId        String?
  user          User?     @relation(fields: [userId], references: [id])
  event         AuthEvent
  ipAddress     String
  userAgent     String
  success       Boolean
  failureReason String?
  timestamp     DateTime  @default(now())

  @@index([userId])
  @@index([event])
  @@index([timestamp])
}

// ============================================================================
// INCIDENT MANAGEMENT
// ============================================================================

model Incident {
  id                    String         @id @default(uuid())
  displayId             String         @unique  // INC-00001
  title                 String
  description           String
  status                IncidentStatus @default(NEW)
  priority              Priority
  impact                Impact
  urgency               Urgency
  categoryId            String
  category              Category       @relation(fields: [categoryId], references: [id])

  // People
  affectedUserId        String?
  affectedUser          User?          @relation("IncidentAffectedUser", fields: [affectedUserId], references: [id])
  reportedById          String
  reportedBy            User           @relation("IncidentReporter", fields: [reportedById], references: [id])
  assigneeId            String?
  assignee              User?          @relation("IncidentAssignee", fields: [assigneeId], references: [id])

  // SLA
  slaConfigId           String?
  slaConfig             SLAConfig?     @relation(fields: [slaConfigId], references: [id])
  responseSlaDue        DateTime?
  resolutionSlaDue      DateTime?
  responseSlaStatus     SLAStatus      @default(ON_TRACK)
  resolutionSlaStatus   SLAStatus      @default(ON_TRACK)
  firstResponseAt       DateTime?
  resolvedAt            DateTime?
  closedAt              DateTime?

  // Resolution
  resolutionNotes       String?
  resolutionCategoryId  String?

  // Timestamps
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt
  deletedAt             DateTime?

  // Relations
  history               IncidentHistory[]
  slaPauses             SLAPause[]
  attachments           IncidentAttachment[]
  problemIncidents      ProblemIncident[]

  @@index([displayId])
  @@index([status])
  @@index([priority])
  @@index([assigneeId])
  @@index([createdAt])
  @@index([resolutionSlaDue])
}

model IncidentHistory {
  id          String   @id @default(uuid())
  incidentId  String
  incident    Incident @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  fieldName   String
  oldValue    Json?
  newValue    Json?
  changedById String
  changedAt   DateTime @default(now())

  @@index([incidentId])
  @@index([changedAt])
}

model SLAPause {
  id         String    @id @default(uuid())
  incidentId String
  incident   Incident  @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  pausedAt   DateTime
  resumedAt  DateTime?
  reason     String

  @@index([incidentId])
}

model IncidentAttachment {
  id           String   @id @default(uuid())
  incidentId   String
  incident     Incident @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  fileName     String
  fileSize     Int
  mimeType     String
  storageKey   String
  uploadedById String
  createdAt    DateTime @default(now())

  @@index([incidentId])
}

// ============================================================================
// PROBLEM MANAGEMENT
// ============================================================================

model Problem {
  id            String        @id @default(uuid())
  displayId     String        @unique  // PRB-00001
  title         String
  description   String
  status        ProblemStatus @default(NEW)
  priority      Priority
  categoryId    String
  category      Category      @relation(fields: [categoryId], references: [id])

  // Investigation
  rootCause     String?
  workaround    String?
  permanentFix  String?

  // People
  assigneeId    String?
  assignee      User?         @relation("ProblemAssignee", fields: [assigneeId], references: [id])
  createdById   String
  createdBy     User          @relation("ProblemCreator", fields: [createdById], references: [id])

  // Resolution
  resolvedAt    DateTime?
  closedAt      DateTime?

  // Timestamps
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  deletedAt     DateTime?

  // Relations
  problemIncidents ProblemIncident[]
  knownError       KnownError?
  linkedChanges    Change[]

  @@index([displayId])
  @@index([status])
  @@index([priority])
  @@index([assigneeId])
}

model ProblemIncident {
  id         String   @id @default(uuid())
  problemId  String
  problem    Problem  @relation(fields: [problemId], references: [id], onDelete: Cascade)
  incidentId String
  incident   Incident @relation(fields: [incidentId], references: [id])
  linkedAt   DateTime @default(now())
  linkedById String

  @@unique([problemId, incidentId])
  @@index([problemId])
  @@index([incidentId])
}

model KnownError {
  id              String   @id @default(uuid())
  problemId       String   @unique
  problem         Problem  @relation(fields: [problemId], references: [id])
  title           String
  description     String
  workaround      String
  affectedSystems String[]
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([isActive])
}

// ============================================================================
// CHANGE MANAGEMENT
// ============================================================================

model Change {
  id                 String       @id @default(uuid())
  displayId          String       @unique  // CHG-00001
  title              String
  description        String
  status             ChangeStatus @default(DRAFT)
  type               ChangeType
  priority           Priority
  risk               RiskLevel
  impact             String
  categoryId         String
  category           Category     @relation(fields: [categoryId], references: [id])

  // People
  requesterId        String
  requester          User         @relation("ChangeRequester", fields: [requesterId], references: [id])
  assigneeId         String?
  assignee           User?        @relation("ChangeAssignee", fields: [assigneeId], references: [id])

  // Plans
  implementationPlan String?
  rollbackPlan       String?
  testPlan           String?

  // Schedule
  scheduledStartAt   DateTime?
  scheduledEndAt     DateTime?
  actualStartAt      DateTime?
  actualEndAt        DateTime?

  // Review
  reviewNotes        String?

  // Links
  linkedProblemId    String?
  linkedProblem      Problem?     @relation(fields: [linkedProblemId], references: [id])

  // Timestamps
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  deletedAt          DateTime?

  // Relations
  approvals          ChangeApproval[]
  history            ChangeHistory[]

  @@index([displayId])
  @@index([status])
  @@index([type])
  @@index([scheduledStartAt])
}

model ChangeApproval {
  id         String           @id @default(uuid())
  changeId   String
  change     Change           @relation(fields: [changeId], references: [id], onDelete: Cascade)
  approverId String
  approver   User             @relation(fields: [approverId], references: [id])
  decision   ApprovalDecision @default(PENDING)
  comments   String?
  decidedAt  DateTime?

  @@unique([changeId, approverId])
  @@index([changeId])
}

model ChangeHistory {
  id          String   @id @default(uuid())
  changeId    String
  change      Change   @relation(fields: [changeId], references: [id], onDelete: Cascade)
  fieldName   String
  oldValue    Json?
  newValue    Json?
  changedById String
  changedAt   DateTime @default(now())

  @@index([changeId])
}

// ============================================================================
// SERVICE REQUEST MANAGEMENT
// ============================================================================

model ServiceRequest {
  id            String        @id @default(uuid())
  displayId     String        @unique  // REQ-00001
  catalogItemId String
  catalogItem   ServiceCatalogItem @relation(fields: [catalogItemId], references: [id])
  requesterId   String
  requester     User          @relation("ServiceRequester", fields: [requesterId], references: [id])
  status        RequestStatus @default(SUBMITTED)
  priority      Priority
  fulfillerId   String?
  fulfiller     User?         @relation("ServiceFulfiller", fields: [fulfillerId], references: [id])
  formData      Json
  notes         String?
  fulfilledAt   DateTime?
  closedAt      DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  deletedAt     DateTime?

  approvals     RequestApproval[]

  @@index([displayId])
  @@index([status])
  @@index([requesterId])
}

model ServiceCatalogItem {
  id               String   @id @default(uuid())
  name             String
  description      String
  categoryId       String
  category         Category @relation(fields: [categoryId], references: [id])
  fulfillmentTime  Int      // Expected time in minutes
  requiresApproval Boolean  @default(false)
  formSchema       Json     // JSON Schema for request form
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  requests         ServiceRequest[]

  @@index([isActive])
  @@index([categoryId])
}

model RequestApproval {
  id         String           @id @default(uuid())
  requestId  String
  request    ServiceRequest   @relation(fields: [requestId], references: [id], onDelete: Cascade)
  approverId String
  approver   User             @relation(fields: [approverId], references: [id])
  decision   ApprovalDecision @default(PENDING)
  comments   String?
  decidedAt  DateTime?

  @@unique([requestId, approverId])
  @@index([requestId])
}

// ============================================================================
// KNOWLEDGE MANAGEMENT
// ============================================================================

model KnowledgeArticle {
  id          String    @id @default(uuid())
  displayId   String    @unique  // KB-00001
  title       String
  content     String
  summary     String?
  status      KBStatus  @default(DRAFT)
  categoryId  String
  category    Category  @relation(fields: [categoryId], references: [id])
  authorId    String
  author      User      @relation(fields: [authorId], references: [id])
  keywords    String[]
  viewCount   Int       @default(0)
  version     Int       @default(1)
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  versions    ArticleVersion[]
  ratings     ArticleRating[]

  @@index([displayId])
  @@index([status])
  @@index([categoryId])
  @@index([keywords])
}

model ArticleVersion {
  id            String           @id @default(uuid())
  articleId     String
  article       KnowledgeArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  versionNumber Int
  title         String
  content       String
  changeNotes   String?
  createdById   String
  createdAt     DateTime         @default(now())

  @@unique([articleId, versionNumber])
  @@index([articleId])
}

model ArticleRating {
  id        String           @id @default(uuid())
  articleId String
  article   KnowledgeArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  userId    String
  user      User             @relation(fields: [userId], references: [id])
  rating    Int              // 1-5
  comment   String?
  createdAt DateTime         @default(now())

  @@unique([articleId, userId])
  @@index([articleId])
}

// ============================================================================
// CONFIGURATION
// ============================================================================

model Category {
  id          String       @id @default(uuid())
  name        String
  description String?
  type        CategoryType
  parentId    String?
  parent      Category?    @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[]   @relation("CategoryHierarchy")
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  incidents        Incident[]
  problems         Problem[]
  changes          Change[]
  catalogItems     ServiceCatalogItem[]
  articles         KnowledgeArticle[]

  @@unique([name, type])
  @@index([type])
  @@index([parentId])
  @@index([isActive])
}

model SLAConfig {
  id                   String   @id @default(uuid())
  name                 String   @unique
  businessStartMinutes Int      @default(540)   // 9:00 AM
  businessEndMinutes   Int      @default(1020)  // 5:00 PM
  workingDays          Int[]    @default([1, 2, 3, 4, 5])  // Mon-Fri
  timezone             String   @default("UTC")
  p1ResponseMinutes    Int      @default(15)
  p1ResolutionMinutes  Int      @default(60)
  p2ResponseMinutes    Int      @default(30)
  p2ResolutionMinutes  Int      @default(240)
  p3ResponseMinutes    Int      @default(120)
  p3ResolutionMinutes  Int      @default(480)
  p4ResponseMinutes    Int      @default(480)
  p4ResolutionMinutes  Int      @default(1440)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  holidays             Holiday[]
  incidents            Incident[]
}

model Holiday {
  id          String    @id @default(uuid())
  slaConfigId String
  slaConfig   SLAConfig @relation(fields: [slaConfigId], references: [id], onDelete: Cascade)
  name        String
  date        DateTime  @db.Date
  createdAt   DateTime  @default(now())

  @@unique([slaConfigId, date])
  @@index([slaConfigId])
  @@index([date])
}

// ============================================================================
// AUDIT & SEQUENCE
// ============================================================================

model AuditLog {
  id         String      @id @default(uuid())
  entityType String      // INCIDENT, PROBLEM, CHANGE, etc.
  entityId   String
  action     AuditAction
  userId     String?
  user       User?       @relation(fields: [userId], references: [id])
  oldValues  Json?
  newValues  Json?
  ipAddress  String?
  timestamp  DateTime    @default(now())

  @@index([entityType, entityId])
  @@index([userId])
  @@index([timestamp])
}

model IdSequence {
  id           String   @id @default(uuid())
  prefix       String   @unique  // INC, PRB, CHG, REQ, KB
  currentValue Int      @default(0)
  updatedAt    DateTime @updatedAt

  @@index([prefix])
}
```

## 3. Index Strategy

### Primary Indexes (Automatic)
- All `id` columns (UUID primary keys)
- All `@unique` columns

### Performance Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| User | email | Login lookup |
| User | status, roleId | User filtering |
| Incident | displayId | Display ID search |
| Incident | status, priority | Dashboard queries |
| Incident | assigneeId | Workload queries |
| Incident | createdAt DESC | Recent incidents |
| Incident | resolutionSlaDue | SLA monitoring |
| Problem | status, priority | Dashboard queries |
| Change | status, scheduledStartAt | Calendar queries |
| AuditLog | entityType, entityId | History lookup |
| AuditLog | timestamp DESC | Recent activity |

## 4. Data Integrity Rules

### Soft Delete Policy
- Never physically delete records
- Set `deletedAt` timestamp instead
- Exclude deleted records in queries by default

### Cascade Rules
- User deletion: Soft delete only (preserve history)
- Incident deletion: Soft delete, keep history
- RefreshToken/PasswordResetToken: Hard delete cascade

### Validation Rules
Enforced at application layer (Zod schemas):

| Entity | Field | Rule |
|--------|-------|------|
| All | title | 5-200 characters |
| Incident | description | Min 20 characters |
| Problem | description | Min 50 characters |
| Change | description | Min 100 characters |
| Change | implementationPlan | Required for Normal/Emergency |
| Change | rollbackPlan | Required for Normal/Emergency |
| KnowledgeArticle | keywords | At least 1 required |

## 5. ID Generation

Display IDs are generated using the `IdSequence` table:

```typescript
async function generateDisplayId(prefix: string): Promise<string> {
  const sequence = await prisma.idSequence.upsert({
    where: { prefix },
    update: { currentValue: { increment: 1 } },
    create: { prefix, currentValue: 1 },
  });

  return `${prefix}-${sequence.currentValue.toString().padStart(5, '0')}`;
}

// Usage:
const incidentId = await generateDisplayId('INC'); // INC-00001
const problemId = await generateDisplayId('PRB');   // PRB-00001
const changeId = await generateDisplayId('CHG');    // CHG-00001
const requestId = await generateDisplayId('REQ');   // REQ-00001
const articleId = await generateDisplayId('KB');    // KB-00001
```

## 6. Migration Strategy

### Initial Migration
1. Create all tables
2. Create indexes
3. Seed roles (Admin, Manager, Operator)
4. Seed default SLA config
5. Seed default categories
6. Create admin user

### Future Migrations
- Use Prisma migrations
- Test on staging first
- Include rollback plan
- Document breaking changes
