# QDB One: API Contracts

**Version**: 1.0
**Date**: February 15, 2026
**Classification**: Confidential - Internal Use Only

---

## Table of Contents

1. [GraphQL Federated Schema](#1-graphql-federated-schema)
2. [REST APIs](#2-rest-apis)
3. [Event Contracts](#3-event-contracts)
4. [Error Code Registry](#4-error-code-registry)

---

## 1. GraphQL Federated Schema

The QDB One API uses **GraphQL Federation** (Apollo Federation v2 / Cosmo). Each subgraph owns its types and extends shared types via `@key` directives. The Gateway composes them into a unified schema.

### 1.1 Shared Types (Extended Across Subgraphs)

```graphql
# ─────────────────────────────────────────────
# Shared scalar types
# ─────────────────────────────────────────────
scalar DateTime
scalar UUID
scalar JSON
scalar Decimal

# ─────────────────────────────────────────────
# Shared enums
# ─────────────────────────────────────────────
enum Portal {
  FINANCING
  ADVISORY
  GUARANTEE
}

enum Language {
  AR
  EN
}

enum SortOrder {
  ASC
  DESC
}

# ─────────────────────────────────────────────
# Pagination
# ─────────────────────────────────────────────
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
  totalCount: Int!
}

input PaginationInput {
  first: Int
  after: String
  last: Int
  before: String
}
```

### 1.2 MPI Subgraph

```graphql
# ─────────────────────────────────────────────
# MPI Subgraph — Person, Organization, Identity
# ─────────────────────────────────────────────

type Person @key(fields: "id") {
  id: UUID!
  fullNameAr: String
  fullNameEn: String
  firstName: String
  lastName: String
  email: String
  phone: String
  qid: String                  # Masked in responses (last 4 digits only)
  nationality: String
  status: PersonStatus!
  isForign: Boolean!
  organizations: [PersonOrgMembership!]!
  identities: [PersonIdentity!]!
  nameAliases: [NameAlias!]!
  consentRecords: [ConsentRecord!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum PersonStatus {
  ACTIVE
  INACTIVE
  MERGED
  SUSPENDED
}

type PersonIdentity {
  id: UUID!
  sourceSystem: String!
  sourceId: String!
  identifierType: IdentifierType!
  identifierValue: String!      # Masked for PII
  confidence: Float!
  linkMethod: LinkMethod!
  linkedAt: DateTime!
  verifiedAt: DateTime
  status: IdentityStatus!
}

enum IdentifierType {
  QID
  NAS_ID
  CR_NUMBER
  EMAIL
  PHONE
  QFI_NUMBER
  PASSPORT_NUMBER
}

enum LinkMethod {
  DETERMINISTIC
  SEMI_DETERMINISTIC
  PROBABILISTIC
  MANUAL_STEWARD
  USER_CONFIRMED
  SYSTEM
}

enum IdentityStatus {
  ACTIVE
  INACTIVE
  UNLINKED
  DISPUTED
}

type NameAlias {
  nameAr: String
  nameEn: String
  sourceSystem: String!
  isCanonical: Boolean!
}

type Organization @key(fields: "id") {
  id: UUID!
  nameAr: String
  nameEn: String
  crNumber: String
  tradeLicenseNumber: String
  establishmentDate: String
  industryCode: String
  legalForm: String
  status: OrgStatus!
  registeredAddress: Address
  members: [PersonOrgMembership!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum OrgStatus {
  ACTIVE
  INACTIVE
  DISSOLVED
  SUSPENDED
}

type Address {
  street: String
  city: String
  zone: String
  poBox: String
  country: String!
}

type PersonOrgMembership {
  person: Person!
  organization: Organization!
  roles: [OrgRole!]!
}

type OrgRole {
  roleType: RoleType!
  sourcePortal: Portal!
  effectiveFrom: String!
  effectiveTo: String
  status: String!
}

enum RoleType {
  CUSTOMER
  STAKEHOLDER
  AUTHORIZED_SIGNATORY
  GUARANTOR
  AUTHORIZED_REPRESENTATIVE
  SHAREHOLDER
  FINANCIAL_CONTROLLER
  EMPLOYEE
  OWNER
  VIEWER
}

type ConsentRecord {
  id: UUID!
  consentType: String!
  consentVersion: String!
  scope: JSON
  granted: Boolean!
  grantedAt: DateTime!
  revokedAt: DateTime
}

# ─── MPI Queries ───

type Query {
  """Current authenticated user's MPI person record"""
  me: Person!

  """Lookup a person by ID (admin only)"""
  person(id: UUID!): Person

  """Search persons (admin only)"""
  searchPersons(
    query: String!
    limit: Int = 20
    offset: Int = 0
  ): PersonSearchResult!

  """Lookup an organization by ID"""
  organization(id: UUID!): Organization

  """Lookup an organization by CR number"""
  organizationByCR(crNumber: String!): Organization

  """Search organizations"""
  searchOrganizations(
    query: String!
    limit: Int = 20
    offset: Int = 0
  ): OrgSearchResult!
}

type PersonSearchResult {
  items: [Person!]!
  totalCount: Int!
}

type OrgSearchResult {
  items: [Organization!]!
  totalCount: Int!
}

# ─── MPI Mutations ───

type Mutation {
  """Update non-government-verified profile fields"""
  updateProfile(input: UpdateProfileInput!): Person!

  """Link an existing portal account via email OTP verification"""
  initiateAccountLinking(input: InitiateAccountLinkingInput!): AccountLinkingResult!

  """Confirm account linking with OTP"""
  confirmAccountLinking(input: ConfirmAccountLinkingInput!): Person!

  """Revoke consent for identity linking"""
  revokeConsent(consentId: UUID!): ConsentRecord!

  """Request data export (PDPPL)"""
  requestDataExport: DataExportRequest!

  """Request data deletion (PDPPL)"""
  requestDataDeletion(reason: String!): DataDeletionRequest!
}

input UpdateProfileInput {
  email: String
  phone: String
  languagePreference: Language
}

input InitiateAccountLinkingInput {
  email: String
  crNumber: String
}

type AccountLinkingResult {
  matchFound: Boolean!
  portalName: String
  roleName: String
  otpSent: Boolean!
  message: String!
}

input ConfirmAccountLinkingInput {
  linkingRequestId: UUID!
  otp: String!
}

type DataExportRequest {
  requestId: UUID!
  status: String!
  estimatedCompletionAt: DateTime!
}

type DataDeletionRequest {
  requestId: UUID!
  status: String!
  message: String!
}
```

### 1.3 Financing Subgraph

```graphql
# ─────────────────────────────────────────────
# Financing Subgraph — Loan, Application, Payment
# ─────────────────────────────────────────────

extend type Organization @key(fields: "id") {
  id: UUID! @external
  loanApplications(
    status: LoanApplicationStatus
    pagination: PaginationInput
  ): LoanApplicationConnection!
  activeLoans: [Loan!]!
  financingSummary: FinancingSummary
}

type FinancingSummary {
  activeLoansCount: Int!
  pendingApplicationsCount: Int!
  totalOutstandingBalance: Decimal!
  currency: String!
  nextPaymentDate: DateTime
  nextPaymentAmount: Decimal
}

type LoanApplication @key(fields: "id") {
  id: String!                   # e.g., "LA-2025-456"
  organization: Organization!
  submitter: Person!
  requestedAmount: Decimal!
  approvedAmount: Decimal
  currency: String!
  loanType: LoanType!
  status: LoanApplicationStatus!
  submittedAt: DateTime
  approvedAt: DateTime
  assignedRM: String
  requiredDocuments: [DocumentChecklist!]!
  documents: [Document!]!
  relatedItems: [RelatedItem!]!
  timeline: [TimelineEvent!]!
  isDraft: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum LoanType {
  TERM_LOAN
  WORKING_CAPITAL
  CREDIT_LINE
  PROJECT_FINANCE
}

enum LoanApplicationStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  ADDITIONAL_INFO_REQUIRED
  APPROVED
  REJECTED
  DISBURSED
  CANCELLED
}

type DocumentChecklist {
  documentType: String!
  label: String!
  labelAr: String
  required: Boolean!
  uploaded: Boolean!
  documentId: UUID
}

type Loan @key(fields: "id") {
  id: String!                   # e.g., "LN-2025-123"
  organization: Organization!
  principalAmount: Decimal!
  outstandingBalance: Decimal!
  interestRate: Float!
  currency: String!
  termMonths: Int!
  disbursementDate: DateTime!
  maturityDate: DateTime!
  status: LoanStatus!
  paymentSchedule: [ScheduledPayment!]!
  paymentHistory(
    pagination: PaginationInput
  ): PaymentConnection!
  nextPayment: ScheduledPayment
  relatedItems: [RelatedItem!]!
  documents: [Document!]!
}

enum LoanStatus {
  ACTIVE
  CLOSED
  DEFAULTED
  RESTRUCTURED
}

type ScheduledPayment {
  dueDate: DateTime!
  amount: Decimal!
  principalPortion: Decimal!
  interestPortion: Decimal!
  status: PaymentStatus!
  daysOverdue: Int
}

enum PaymentStatus {
  UPCOMING
  DUE
  OVERDUE
  PAID
  PARTIALLY_PAID
}

type Payment {
  id: String!
  loanId: String!
  amount: Decimal!
  paymentDate: DateTime!
  method: String
  confirmationNumber: String
  status: String!
}

type PaymentConnection {
  edges: [PaymentEdge!]!
  pageInfo: PageInfo!
}

type PaymentEdge {
  node: Payment!
  cursor: String!
}

type LoanApplicationConnection {
  edges: [LoanApplicationEdge!]!
  pageInfo: PageInfo!
}

type LoanApplicationEdge {
  node: LoanApplication!
  cursor: String!
}

# ─── Financing Queries ───

type Query {
  """Get financing overview for the current user's active org"""
  financingOverview(orgId: UUID!): FinancingSummary!

  """Get a specific loan application"""
  loanApplication(id: String!): LoanApplication

  """Get a specific loan"""
  loan(id: String!): Loan

  """Get all active loans for an organization"""
  activeLoans(orgId: UUID!): [Loan!]!
}

# ─── Financing Mutations ───

type Mutation {
  """Start a new loan application (creates draft)"""
  createLoanApplication(input: CreateLoanApplicationInput!): LoanApplication!

  """Update a draft loan application"""
  updateLoanApplication(id: String!, input: UpdateLoanApplicationInput!): LoanApplication!

  """Submit a draft loan application"""
  submitLoanApplication(id: String!): LoanApplication!

  """Upload a document for a loan application"""
  uploadApplicationDocument(
    applicationId: String!
    documentType: String!
    file: Upload!
  ): Document!

  """Delete a draft loan application"""
  deleteDraftApplication(id: String!): Boolean!
}

input CreateLoanApplicationInput {
  orgId: UUID!
  loanType: LoanType!
  requestedAmount: Decimal!
  currency: String
  purpose: String
}

input UpdateLoanApplicationInput {
  requestedAmount: Decimal
  purpose: String
  additionalInfo: JSON
}
```

### 1.4 Guarantee Subgraph

```graphql
# ─────────────────────────────────────────────
# Guarantee Subgraph — Guarantee, Signature, Claim
# ─────────────────────────────────────────────

extend type Organization @key(fields: "id") {
  id: UUID! @external
  guarantees(status: GuaranteeStatus): [Guarantee!]!
  pendingSignatures: [Guarantee!]!
  guaranteeSummary: GuaranteeSummary
}

type GuaranteeSummary {
  activeCount: Int!
  pendingSignatureCount: Int!
  totalGuaranteedAmount: Decimal!
  currency: String!
}

type Guarantee @key(fields: "id") {
  id: String!                   # e.g., "GR-2025-100"
  beneficiaryOrg: Organization!
  guarantorOrg: Organization
  amount: Decimal!
  currency: String!
  guaranteeType: GuaranteeType!
  status: GuaranteeStatus!
  issueDate: DateTime
  expiryDate: DateTime!
  beneficiaryName: String
  terms: String
  requiredSignatories: [SignatoryInfo!]!
  signatures: [SignatureRecord!]!
  claims: [Claim!]!
  collateral: [Collateral!]!
  linkedLoanApplication: LoanApplication
  relatedItems: [RelatedItem!]!
  documents: [Document!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum GuaranteeType {
  BANK_GUARANTEE
  LETTER_OF_CREDIT
  PERFORMANCE_BOND
  ADVANCE_PAYMENT_GUARANTEE
}

enum GuaranteeStatus {
  DRAFT
  PENDING_SIGNATURE
  PARTIALLY_SIGNED
  ACTIVE
  EXPIRED
  CANCELLED
  CLAIMED
}

type SignatoryInfo {
  person: Person!
  required: Boolean!
  signed: Boolean!
  signedAt: DateTime
}

type SignatureRecord {
  id: UUID!
  signatory: Person!
  signedAt: DateTime!
  mfaLevel: String!
  ipAddress: String
  userAgent: String
  documentHash: String!
}

type Claim {
  id: String!
  claimant: String!
  amount: Decimal!
  filedDate: DateTime!
  status: ClaimStatus!
  resolutionDate: DateTime
  description: String
}

enum ClaimStatus {
  FILED
  UNDER_REVIEW
  APPROVED
  REJECTED
  SETTLED
}

type Collateral {
  id: String!
  type: String!
  description: String!
  estimatedValue: Decimal
  currency: String
  status: String!
}

# ─── Guarantee Queries ───

type Query {
  """Get guarantee overview for an organization"""
  guaranteeOverview(orgId: UUID!): GuaranteeSummary!

  """Get a specific guarantee"""
  guarantee(id: String!): Guarantee

  """Get all guarantees pending the current user's signature"""
  myPendingSignatures: [Guarantee!]!
}

# ─── Guarantee Mutations ───

type Mutation {
  """Sign a guarantee (requires step-up auth)"""
  signGuarantee(input: SignGuaranteeInput!): SignatureResult!
}

input SignGuaranteeInput {
  guaranteeId: String!
  """Step-up auth token from NAS re-authentication"""
  stepUpToken: String!
}

type SignatureResult {
  success: Boolean!
  signature: SignatureRecord
  allSignaturesComplete: Boolean!
  newStatus: GuaranteeStatus
  error: String
}
```

### 1.5 Advisory Subgraph

```graphql
# ─────────────────────────────────────────────
# Advisory Subgraph — Program, Session, Assessment
# ─────────────────────────────────────────────

extend type Organization @key(fields: "id") {
  id: UUID! @external
  advisoryPrograms: [AdvisoryProgram!]!
  advisorySummary: AdvisorySummary
}

type AdvisorySummary {
  enrolledProgramsCount: Int!
  upcomingSessionsCount: Int!
  completedAssessmentsCount: Int!
}

type AdvisoryProgram @key(fields: "id") {
  id: String!
  name: String!
  nameAr: String
  description: String
  descriptionAr: String
  clientOrg: Organization!
  enrollmentDate: DateTime!
  progress: Float!              # 0-100
  status: ProgramStatus!
  milestones: [Milestone!]!
  sessions: [AdvisorySession!]!
  assessments: [Assessment!]!
  nextSession: AdvisorySession
}

enum ProgramStatus {
  ENROLLED
  IN_PROGRESS
  COMPLETED
  WITHDRAWN
}

type Milestone {
  id: String!
  title: String!
  titleAr: String
  dueDate: DateTime
  completed: Boolean!
  completedAt: DateTime
}

type AdvisorySession @key(fields: "id") {
  id: String!
  program: AdvisoryProgram!
  clientOrg: Organization!
  advisorName: String!
  topic: String!
  topicAr: String
  scheduledAt: DateTime!
  duration: Int!                # minutes
  location: String
  virtualMeetingLink: String
  status: SessionStatus!
  notes: String
  actionItems: [String!]
  preparationMaterials: [Document!]
  relatedItems: [RelatedItem!]!
  cancellationAllowed: Boolean!
}

enum SessionStatus {
  SCHEDULED
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

type Assessment @key(fields: "id") {
  id: String!
  program: AdvisoryProgram!
  clientOrg: Organization!
  assessmentDate: DateTime!
  overallScore: Float!
  categories: [AssessmentCategory!]!
  recommendations: [Recommendation!]!
  status: String!
}

type AssessmentCategory {
  name: String!
  nameAr: String
  score: Float!
  maxScore: Float!
  summary: String
}

type Recommendation {
  text: String!
  textAr: String
  linkedService: Portal
  deepLink: String
  priority: String!
}

# ─── Advisory Queries ───

type Query {
  """Get advisory overview for an organization"""
  advisoryOverview(orgId: UUID!): AdvisorySummary!

  """Get a specific advisory program"""
  advisoryProgram(id: String!): AdvisoryProgram

  """Get a specific session"""
  advisorySession(id: String!): AdvisorySession

  """Get a specific assessment"""
  assessment(id: String!): Assessment

  """Get upcoming sessions for the current user"""
  myUpcomingSessions(limit: Int = 10): [AdvisorySession!]!
}

# ─── Advisory Mutations ───

type Mutation {
  """Cancel an advisory session"""
  cancelSession(sessionId: String!, reason: String!): AdvisorySession!
}
```

### 1.6 Dashboard Subgraph

```graphql
# ─────────────────────────────────────────────
# Dashboard Subgraph — reads from Unified Read Store
# ─────────────────────────────────────────────

type DashboardData {
  items: [DashboardItem!]!
  pendingActions: [DashboardItem!]!
  activityFeed: [ActivityItem!]!
  portalSummaries: [PortalSummary!]!
  lastUpdatedAt: DateTime!
}

type DashboardItem {
  id: UUID!
  sourcePortal: Portal!
  itemType: String!
  sourceRecordId: String!
  status: String!
  title: String!
  titleAr: String
  amount: Decimal
  currency: String
  dueDate: DateTime
  requiresAction: Boolean!
  actionType: String
  actionLabel: String
  actionDeepLink: String
  urgency: Urgency!
  relatedItems: [RelatedItem!]
  metadata: JSON
  lastSyncedAt: DateTime!
}

enum Urgency {
  CRITICAL
  HIGH
  NORMAL
  LOW
}

type ActivityItem {
  id: UUID!
  sourcePortal: Portal!
  action: String!
  description: String!
  descriptionAr: String
  sourceRecordType: String
  sourceRecordId: String
  deepLink: String
  actorName: String
  createdAt: DateTime!
}

type PortalSummary {
  portal: Portal!
  itemCount: Int!
  pendingActionCount: Int!
  hasData: Boolean!
}

type RelatedItem {
  portal: Portal!
  itemType: String!
  recordId: String!
  title: String!
  titleAr: String
  status: String!
  deepLink: String!
}

# ─── Dashboard Queries ───

type Query {
  """Get the unified dashboard for the current user"""
  dashboard(orgId: UUID!): DashboardData!

  """Get activity feed with pagination"""
  activityFeed(
    orgId: UUID
    portal: Portal
    pagination: PaginationInput
  ): ActivityFeedConnection!
}

type ActivityFeedConnection {
  edges: [ActivityItemEdge!]!
  pageInfo: PageInfo!
}

type ActivityItemEdge {
  node: ActivityItem!
  cursor: String!
}
```

### 1.7 Notification Subgraph

```graphql
# ─────────────────────────────────────────────
# Notification Subgraph
# ─────────────────────────────────────────────

type Notification @key(fields: "id") {
  id: UUID!
  sourcePortal: Portal!
  notificationType: NotificationType!
  title: String!
  titleAr: String
  body: String!
  bodyAr: String
  deepLink: String
  read: Boolean!
  readAt: DateTime
  actioned: Boolean!
  priority: NotificationPriority!
  createdAt: DateTime!
}

enum NotificationType {
  ACTION_REQUIRED
  STATUS_UPDATE
  INFORMATIONAL
}

enum NotificationPriority {
  URGENT
  NORMAL
  LOW
}

type NotificationPreference {
  sourcePortal: Portal!
  notificationType: NotificationType!
  channelInApp: Boolean!
  channelEmail: Boolean!
  channelPush: Boolean!
}

# ─── Notification Queries ───

type Query {
  """Get notifications for the current user"""
  notifications(
    unreadOnly: Boolean
    portal: Portal
    pagination: PaginationInput
  ): NotificationConnection!

  """Get unread notification count"""
  unreadNotificationCount: Int!

  """Get notification preferences"""
  notificationPreferences: [NotificationPreference!]!
}

type NotificationConnection {
  edges: [NotificationEdge!]!
  pageInfo: PageInfo!
}

type NotificationEdge {
  node: Notification!
  cursor: String!
}

# ─── Notification Mutations ───

type Mutation {
  """Mark a notification as read"""
  markNotificationRead(id: UUID!): Notification!

  """Mark all notifications as read"""
  markAllNotificationsRead: Int!

  """Update notification preferences"""
  updateNotificationPreferences(
    input: [NotificationPreferenceInput!]!
  ): [NotificationPreference!]!
}

input NotificationPreferenceInput {
  sourcePortal: Portal!
  notificationType: NotificationType!
  channelInApp: Boolean!
  channelEmail: Boolean!
  channelPush: Boolean!
}
```

### 1.8 Document Subgraph

```graphql
# ─────────────────────────────────────────────
# Document Subgraph
# ─────────────────────────────────────────────

type Document @key(fields: "id") {
  id: UUID!
  fileName: String!
  fileSize: Int!                # bytes
  mimeType: String!
  documentType: String!
  sourcePortal: Portal!
  associatedEntityType: String   # 'loan_application', 'guarantee', etc.
  associatedEntityId: String
  uploadedBy: Person!
  uploadedAt: DateTime!
  downloadUrl: String!          # Signed URL (time-limited)
  metadata: JSON
}

# ─── Document Queries ───

type Query {
  """Get all documents for the current user"""
  documents(
    orgId: UUID
    portal: Portal
    documentType: String
    pagination: PaginationInput
  ): DocumentConnection!

  """Get a specific document"""
  document(id: UUID!): Document

  """Get documents for a specific entity"""
  entityDocuments(
    entityType: String!
    entityId: String!
  ): [Document!]!
}

type DocumentConnection {
  edges: [DocumentEdge!]!
  pageInfo: PageInfo!
}

type DocumentEdge {
  node: Document!
  cursor: String!
}

# ─── Document Mutations ───

type Mutation {
  """Upload a document"""
  uploadDocument(input: UploadDocumentInput!): Document!

  """Delete a document (only own uploads)"""
  deleteDocument(id: UUID!): Boolean!
}

input UploadDocumentInput {
  entityType: String!
  entityId: String!
  documentType: String!
  file: Upload!
}
```

### 1.9 Search (Unified Query)

```graphql
# ─────────────────────────────────────────────
# Search — executed via Dashboard Subgraph or
# separate Search Subgraph against OpenSearch
# ─────────────────────────────────────────────

type SearchResult {
  query: String!
  totalCount: Int!
  categories: [SearchCategory!]!
  executionTimeMs: Int!
}

type SearchCategory {
  name: String!                 # "Companies", "Applications", "Guarantees", etc.
  count: Int!
  items: [SearchItem!]!
}

type SearchItem {
  id: String!
  title: String!
  titleAr: String
  description: String
  sourcePortal: Portal!
  entityType: String!
  status: String
  deepLink: String!
  highlights: [String!]         # Highlighted matching text fragments
  score: Float!
}

input SearchFilters {
  portal: Portal
  entityType: String
  status: String
  dateFrom: DateTime
  dateTo: DateTime
}

type Query {
  """Global cross-portal search"""
  search(
    query: String!
    filters: SearchFilters
    limit: Int = 20
    offset: Int = 0
  ): SearchResult!
}
```

---

## 2. REST APIs

REST APIs are used for services that are not part of the GraphQL federation: Auth, MPI internal ops, Webhooks, and Admin system endpoints.

### 2.1 Auth API

**Base URL**: `https://auth.qdb.qa/api/v1`

#### POST /auth/login/initiate

Initiates the NAS login flow by redirecting to Keycloak.

```
Request:
  POST /auth/login/initiate
  Content-Type: application/json

  {
    "returnUrl": "/financing/applications",
    "language": "en"
  }

Response: 302 Redirect
  Location: https://auth.qdb.qa/realms/qdb-one/protocol/openid-connect/auth?
    client_id=qdb-one-web&
    redirect_uri=https://qdb.qa/auth/callback&
    response_type=code&
    scope=openid+qdb-personas&
    state={encrypted_state}&
    ui_locales=en
```

#### POST /auth/callback

Handles the OIDC callback from Keycloak after NAS authentication.

```
Request:
  POST /auth/callback
  Content-Type: application/json

  {
    "code": "oidc-auth-code",
    "state": "encrypted-state-token"
  }

Response: 200 OK
  Set-Cookie: qdb_session={jwt}; HttpOnly; Secure; SameSite=Strict

  {
    "success": true,
    "personId": "mpi-uuid-12345",
    "isFirstLogin": false,
    "pendingLinking": null,
    "redirectTo": "/financing/applications"
  }

Response (first login with linking): 200 OK
  {
    "success": true,
    "personId": "mpi-uuid-12345",
    "isFirstLogin": true,
    "pendingLinking": {
      "matchedAccounts": [
        {
          "portal": "direct_financing",
          "role": "Customer",
          "orgName": "Al-Kuwari Trading LLC",
          "crNumber": "12345",
          "matchMethod": "qid",
          "confidence": 100
        }
      ],
      "linkingSessionId": "link-session-uuid"
    },
    "redirectTo": "/auth/link-accounts"
  }
```

#### POST /auth/link-accounts/confirm

Confirms identity linking during first login (Migration Wave 2).

```
Request:
  POST /auth/link-accounts/confirm
  Content-Type: application/json
  Authorization: Bearer {jwt}

  {
    "linkingSessionId": "link-session-uuid",
    "confirmedAccounts": [
      { "portal": "direct_financing", "sourceId": "C-1234", "confirmed": true },
      { "portal": "advisory", "sourceId": "U-5678", "confirmed": false }
    ],
    "consentVersion": "v1.0"
  }

Response: 200 OK
  {
    "success": true,
    "linkedCount": 1,
    "rejectedCount": 1,
    "personId": "mpi-uuid-12345",
    "redirectTo": "/"
  }
```

#### POST /auth/qfi/login

Foreign shareholder login (QFI + email OTP).

```
Request:
  POST /auth/qfi/login
  Content-Type: application/json

  {
    "qfiNumber": "QFI-123456",
    "email": "investor@example.com"
  }

Response: 200 OK
  {
    "otpSent": true,
    "maskedEmail": "inv***@example.com",
    "expiresInSeconds": 300,
    "loginSessionId": "qfi-session-uuid"
  }

Response: 400 Bad Request
  {
    "error": {
      "code": "QDB-AUTH-4001",
      "message": "Invalid QFI number or email address"
    }
  }

Response: 403 Forbidden
  {
    "error": {
      "code": "QDB-AUTH-4003",
      "message": "Your account requires re-verification. Please contact your QDB Relationship Manager."
    }
  }
```

#### POST /auth/qfi/verify-otp

Verify OTP for QFI login.

```
Request:
  POST /auth/qfi/verify-otp
  Content-Type: application/json

  {
    "loginSessionId": "qfi-session-uuid",
    "otp": "123456"
  }

Response: 200 OK
  Set-Cookie: qdb_session={jwt}; HttpOnly; Secure; SameSite=Strict

  {
    "success": true,
    "personId": "mpi-uuid-67890",
    "redirectTo": "/"
  }

Response: 401 Unauthorized (wrong OTP)
  {
    "error": {
      "code": "QDB-AUTH-4011",
      "message": "Invalid OTP. 3 attempts remaining.",
      "details": { "attemptsRemaining": 3 }
    }
  }

Response: 429 Too Many Requests (locked)
  {
    "error": {
      "code": "QDB-AUTH-4291",
      "message": "Account locked for 30 minutes due to repeated failed attempts.",
      "details": { "lockedUntil": "2026-02-15T11:00:00Z" }
    }
  }
```

#### POST /auth/token/refresh

Refresh the session token.

```
Request:
  POST /auth/token/refresh
  Cookie: qdb_session={jwt}

Response: 200 OK
  Set-Cookie: qdb_session={new_jwt}; HttpOnly; Secure; SameSite=Strict

  {
    "expiresAt": "2026-02-15T12:00:00Z"
  }
```

#### POST /auth/session/extend

Extend the session (from the expiry warning modal).

```
Request:
  POST /auth/session/extend
  Cookie: qdb_session={jwt}

Response: 200 OK
  {
    "extended": true,
    "newExpiresAt": "2026-02-15T12:00:00Z"
  }
```

#### POST /auth/step-up

Initiate step-up authentication for sensitive operations.

```
Request:
  POST /auth/step-up
  Content-Type: application/json
  Cookie: qdb_session={jwt}

  {
    "requiredLevel": "enhanced",
    "returnUrl": "/guarantees/GR-2025-100/sign",
    "operation": "guarantee_signing"
  }

Response: 200 OK
  {
    "redirectUrl": "https://auth.qdb.qa/realms/qdb-one/protocol/openid-connect/auth?acr_values=enhanced&...",
    "stepUpSessionId": "step-up-uuid"
  }
```

### 2.2 MPI Internal API

**Base URL**: `https://api.qdb.qa/internal/mpi/v1`
**Access**: Internal services only (mTLS + service account JWT)

#### POST /mpi/match

Run matching algorithm for an incoming record.

```
Request:
  POST /mpi/match
  Content-Type: application/json

  {
    "sourceSystem": "financing_core",
    "sourceId": "C-99999",
    "identifiers": {
      "qid": "28400000000",
      "email": "ahmed@company.qa",
      "crNumber": "12345"
    },
    "name": {
      "firstNameAr": "أحمد",
      "lastNameAr": "الثاني",
      "firstNameEn": "Ahmed",
      "lastNameEn": "Al-Thani"
    }
  }

Response: 200 OK
  {
    "matchResult": "deterministic",
    "personId": "mpi-uuid-12345",
    "confidence": 100,
    "matchedOn": "qid",
    "action": "auto_linked",
    "identityId": "identity-uuid-new"
  }

Response: 200 OK (probabilistic, needs review)
  {
    "matchResult": "probabilistic",
    "candidatePersonId": "mpi-uuid-12345",
    "confidence": 82,
    "matchedOn": "email+name",
    "action": "queued_for_review",
    "matchQueueId": "match-uuid-456"
  }
```

#### GET /mpi/golden-record/{personId}

Get the complete golden record for a person.

```
Response: 200 OK
  {
    "personId": "mpi-uuid-12345",
    "goldenRecord": {
      "firstNameAr": "أحمد",
      "lastNameAr": "الثاني",
      "firstNameEn": "Ahmed",
      "lastNameEn": "Al-Thani",
      "email": "ahmed@company.qa",
      "phone": "+974-5551234",
      "qid": "284*****000"
    },
    "identities": [...],
    "organizations": [...],
    "roles": [...],
    "mergeHistory": [...]
  }
```

### 2.3 Webhook Gateway API

**Base URL**: `https://api.qdb.qa/webhooks/v1`

#### POST /webhooks/qfc

Receive webhooks from Qatar Financial Centre.

```
Request:
  POST /webhooks/qfc
  Content-Type: application/json
  X-QFC-Signature: sha256=abc123...
  X-QFC-Webhook-ID: wh-uuid-789
  X-QFC-Timestamp: 2026-02-15T10:30:00Z

  {
    "eventType": "company.status.changed",
    "companyId": "QFC-12345",
    "crNumber": "12345",
    "previousStatus": "active",
    "newStatus": "compliance_review",
    "reason": "Annual review triggered",
    "timestamp": "2026-02-15T10:30:00Z"
  }

Response: 200 OK
  { "received": true, "webhookId": "wh-uuid-789" }

Response: 401 Unauthorized (invalid signature)
  { "error": { "code": "QDB-WH-4010", "message": "Invalid webhook signature" } }

Response: 409 Conflict (duplicate)
  { "received": true, "webhookId": "wh-uuid-789", "duplicate": true }
```

#### POST /webhooks/moci

Receive webhooks from MOCI.

```
Request:
  POST /webhooks/moci
  Content-Type: application/json
  X-MOCI-Signature: sha256=def456...

  {
    "eventType": "cr.ownership.changed",
    "crNumber": "12345",
    "changes": [
      {
        "shareholderId": "SH-001",
        "name": "New Shareholder Name",
        "previousPercentage": 0,
        "newPercentage": 25,
        "effectiveDate": "2026-02-01"
      }
    ],
    "timestamp": "2026-02-15T10:30:00Z"
  }

Response: 200 OK
  { "received": true }
```

### 2.4 Admin API

**Base URL**: `https://admin-api.qdb.qa/api/v1`
**Access**: Admin BFF only (internal network + admin JWT)

#### POST /admin/foreign-shareholders

Onboard a new foreign shareholder (RM only).

```
Request:
  POST /admin/foreign-shareholders
  Content-Type: application/json
  Authorization: Bearer {admin_jwt}

  {
    "passportNumber": "AB1234567",
    "passportCountry": "GB",
    "passportExpiry": "2027-06-15",
    "fullNameEn": "John Smith",
    "email": "john.smith@company.com",
    "phone": "+44-7890-123456",
    "linkedOrganizations": [
      { "crNumber": "12345", "roleType": "shareholder" }
    ],
    "kycMethod": "video_kyc"
  }

Response: 201 Created
  {
    "qfiId": "qfi-uuid-new",
    "qfiNumber": "QFI-789012",
    "personId": "mpi-uuid-new",
    "status": "pending_verification",
    "message": "QFI account created. Complete KYC verification to activate."
  }
```

#### GET /admin/mpi/review-queue

Get pending MPI matches for Data Steward review.

```
Request:
  GET /admin/mpi/review-queue?status=pending&limit=20&sortBy=confidence&order=desc
  Authorization: Bearer {admin_jwt}

Response: 200 OK
  {
    "items": [
      {
        "matchId": "match-uuid-456",
        "compositeScore": 82.5,
        "recordA": {
          "sourceSystem": "financing_core",
          "sourceId": "C-1234",
          "name": "Mohammed Al-Thani",
          "email": "m.thani@co.qa",
          "crNumber": "12345"
        },
        "recordB": {
          "sourceSystem": "advisory_main",
          "sourceId": "U-5678",
          "name": "Muhammad AlThani",
          "email": "m.thani@co.qa",
          "crNumber": null
        },
        "scoreBreakdown": {
          "emailMatch": 100,
          "nameMatch": 78,
          "crMatch": 0,
          "phoneMatch": 0
        },
        "createdAt": "2026-02-14T08:00:00Z"
      }
    ],
    "totalCount": 15,
    "pendingCount": 15
  }
```

#### POST /admin/mpi/review-queue/{matchId}/resolve

Resolve a pending match (Data Steward).

```
Request:
  POST /admin/mpi/review-queue/match-uuid-456/resolve
  Content-Type: application/json
  Authorization: Bearer {admin_jwt}

  {
    "resolution": "link",
    "justification": "Same person confirmed via phone call and CR registry cross-reference"
  }

Response: 200 OK
  {
    "matchId": "match-uuid-456",
    "resolution": "link",
    "resultingPersonId": "mpi-uuid-12345",
    "linkedIdentityId": "identity-uuid-new",
    "auditLogId": "audit-uuid-789"
  }
```

#### GET /admin/system/health

System health dashboard data.

```
Response: 200 OK
  {
    "overall": "healthy",
    "services": [
      { "name": "graphql-gateway", "status": "ok", "latencyMs": 12 },
      { "name": "mpi-service", "status": "ok", "latencyMs": 8 },
      { "name": "keycloak", "status": "ok", "latencyMs": 15 },
      { "name": "openfga", "status": "ok", "latencyMs": 5 },
      { "name": "financing-subgraph", "status": "ok", "latencyMs": 45 },
      { "name": "guarantee-subgraph", "status": "ok", "latencyMs": 38 },
      { "name": "advisory-subgraph", "status": "warning", "latencyMs": 220 },
      { "name": "kafka", "status": "ok", "consumerLag": { "mpi-enrichment": 12, "dashboard-projection": 45 } },
      { "name": "opensearch", "status": "ok", "latencyMs": 22 }
    ],
    "integrations": [
      { "name": "NAS", "status": "ok", "circuitBreaker": "closed" },
      { "name": "MOCI", "status": "degraded", "circuitBreaker": "half_open" },
      { "name": "QFC", "status": "ok", "circuitBreaker": "closed" }
    ],
    "timestamp": "2026-02-15T10:30:00Z"
  }
```

---

## 3. Event Contracts

See the detailed event schemas in `data-model.md`, Section 5.

### 3.1 Topic Naming Convention Summary

```
{origin}.{domain}.{entity}.{action}

CDC:  cdc.{database}.{table}
App:  app.{portal}.{entity}-{action}
MPI:  mpi.{entity}.{action}
Ext:  ext.{system}.{entity}-{action}
DLQ:  dlq.{consumer-name}
```

### 3.2 Event Envelope

All events use the envelope defined in `data-model.md` Section 5.1 with:
- `eventId` (UUID) for idempotency
- `schemaVersion` for compatibility
- `correlationId` for distributed tracing
- `actor` for audit trail

---

## 4. Error Code Registry

### 4.1 Error Code Format

```
QDB-{SERVICE}-{HTTP_STATUS}{SEQUENCE}

SERVICE codes:
  AUTH = Authentication
  MPI  = Master Person Index
  FIN  = Financing
  GUAR = Guarantee
  ADV  = Advisory
  DASH = Dashboard
  NOTIF = Notifications
  DOC  = Documents
  SRCH = Search
  WH   = Webhook Gateway
  ADMIN = Admin Panel
  SYS  = System / Infrastructure
```

### 4.2 Authentication Errors (QDB-AUTH-*)

| Code | HTTP Status | Message | Description |
|------|-------------|---------|-------------|
| QDB-AUTH-4001 | 400 | Invalid QFI number or email address | QFI login with non-matching credentials |
| QDB-AUTH-4002 | 400 | OTP expired. Please request a new one. | OTP submission after 5-minute window |
| QDB-AUTH-4003 | 403 | Your account requires re-verification. | QFI login with expired passport |
| QDB-AUTH-4010 | 401 | Authentication failed | Generic auth failure |
| QDB-AUTH-4011 | 401 | Invalid OTP. {N} attempts remaining. | Wrong OTP with attempts left |
| QDB-AUTH-4012 | 401 | Session expired. Please sign in again. | Expired JWT / session |
| QDB-AUTH-4013 | 401 | Step-up authentication required | Operation requires higher MFA level |
| QDB-AUTH-4030 | 403 | Access denied | Insufficient permissions (OpenFGA check failed) |
| QDB-AUTH-4031 | 403 | This operation requires a Qatar ID holder as a co-signer. | QFI user attempting QID-required operation |
| QDB-AUTH-4291 | 429 | Account locked for 30 minutes. | 5 failed OTP attempts |
| QDB-AUTH-4292 | 429 | Too many OTP requests. Try again in {N} minutes. | OTP rate limit exceeded |
| QDB-AUTH-5001 | 503 | National Authentication System is temporarily unavailable. | NAS circuit breaker open |
| QDB-AUTH-5002 | 500 | Authentication service error | Internal Keycloak error |

### 4.3 MPI Errors (QDB-MPI-*)

| Code | HTTP Status | Message | Description |
|------|-------------|---------|-------------|
| QDB-MPI-4001 | 404 | Person not found | Person ID does not exist in MPI |
| QDB-MPI-4002 | 404 | Organization not found | Org ID does not exist |
| QDB-MPI-4003 | 409 | This account is already linked to another QDB One identity. | Attempted linking of already-linked account |
| QDB-MPI-4004 | 400 | No unlinked account found for this email/CR | Manual linking search returned no results |
| QDB-MPI-4005 | 400 | Invalid linking OTP | OTP verification during account linking failed |
| QDB-MPI-4006 | 409 | Consent already revoked | Attempted revoking already-revoked consent |
| QDB-MPI-5001 | 500 | Identity matching service error | MPI match engine failure |
| QDB-MPI-5002 | 500 | Golden record update failed | Survivorship rule application failure |

### 4.4 Financing Errors (QDB-FIN-*)

| Code | HTTP Status | Message | Description |
|------|-------------|---------|-------------|
| QDB-FIN-4001 | 404 | Loan application not found | Application ID does not exist or user lacks access |
| QDB-FIN-4002 | 404 | Loan not found | Loan ID does not exist or user lacks access |
| QDB-FIN-4003 | 400 | Application is not in draft status | Attempted edit of non-draft application |
| QDB-FIN-4004 | 400 | Required documents missing | Submission without all required documents |
| QDB-FIN-4005 | 400 | Invalid loan amount | Amount below minimum or above maximum |
| QDB-FIN-5001 | 500 | Financing service error | Internal financing subgraph error |
| QDB-FIN-5002 | 503 | Financing database temporarily unavailable | financing_core DB unreachable |

### 4.5 Guarantee Errors (QDB-GUAR-*)

| Code | HTTP Status | Message | Description |
|------|-------------|---------|-------------|
| QDB-GUAR-4001 | 404 | Guarantee not found | Guarantee ID does not exist or user lacks access |
| QDB-GUAR-4002 | 400 | Guarantee is not pending signature | Attempted signing of non-pending guarantee |
| QDB-GUAR-4003 | 403 | You are not an authorized signatory for this guarantee | User not in requiredSignatories list |
| QDB-GUAR-4004 | 400 | Step-up authentication failed or expired | Step-up token invalid |
| QDB-GUAR-4005 | 400 | Guarantee has already been signed by you | Duplicate signature attempt |
| QDB-GUAR-5001 | 500 | Guarantee service error | Internal guarantee subgraph error |

### 4.6 Advisory Errors (QDB-ADV-*)

| Code | HTTP Status | Message | Description |
|------|-------------|---------|-------------|
| QDB-ADV-4001 | 404 | Program not found | Program ID does not exist |
| QDB-ADV-4002 | 404 | Session not found | Session ID does not exist |
| QDB-ADV-4003 | 400 | Session cancellation not allowed | Cancellation policy does not permit |
| QDB-ADV-4004 | 404 | Assessment not found | Assessment ID does not exist |
| QDB-ADV-5001 | 500 | Advisory service error | Internal advisory subgraph error |

### 4.7 Dashboard / Search / Notification Errors

| Code | HTTP Status | Message | Description |
|------|-------------|---------|-------------|
| QDB-DASH-5001 | 500 | Dashboard data load failed | Read store query failure |
| QDB-DASH-5002 | 503 | Dashboard data may be stale | Read store sync lag detected |
| QDB-SRCH-4001 | 400 | Search query too short | Query must be at least 2 characters |
| QDB-SRCH-5001 | 503 | Search service temporarily unavailable | OpenSearch cluster issue |
| QDB-NOTIF-4001 | 404 | Notification not found | Notification ID does not exist |
| QDB-DOC-4001 | 404 | Document not found | Document ID does not exist |
| QDB-DOC-4002 | 400 | File too large | Uploaded file exceeds size limit |
| QDB-DOC-4003 | 400 | Unsupported file type | File type not in allowed list |

### 4.8 System / Infrastructure Errors

| Code | HTTP Status | Message | Description |
|------|-------------|---------|-------------|
| QDB-SYS-4290 | 429 | Rate limit exceeded | Per-client rate limit hit |
| QDB-SYS-5000 | 500 | Internal server error | Unhandled exception |
| QDB-SYS-5030 | 503 | Service temporarily unavailable | Service down or overloaded |
| QDB-WH-4010 | 401 | Invalid webhook signature | HMAC verification failed |
| QDB-WH-4011 | 400 | Invalid webhook payload | Schema validation failed |
