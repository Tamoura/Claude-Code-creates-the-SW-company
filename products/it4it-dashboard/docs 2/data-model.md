# IT4IT Dashboard - Data Model

This document defines the TypeScript interfaces for all IT4IT entities used in the dashboard's mock data layer.

## Common Types

```typescript
// src/types/common.ts

export type UUID = string;
export type ISODateTime = string;

export interface BaseEntity {
  id: UUID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface AuditableEntity extends BaseEntity {
  createdBy: string;
  updatedBy: string;
}

export type Priority = 1 | 2 | 3 | 4; // 1=Critical, 4=Low
export type Severity = 1 | 2 | 3 | 4; // 1=Critical, 4=Warning

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface TimeSeriesDataPoint {
  date: ISODateTime;
  value: number;
  label?: string;
}

export interface KPIMetric {
  label: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  status?: 'good' | 'warning' | 'critical';
}
```

---

## Strategy to Portfolio (S2P)

### Entity Relationship Diagram

```
┌──────────────────┐
│     Demand       │
├──────────────────┤
│ id: UUID         │
│ title: String    │
│ status: Status   │──────┐
│ priority: Num    │      │
│ requestor: String│      │
│ businessUnit: Str│      │
└──────────────────┘      │
         │                │
         │ promotes to    │
         ▼                │
┌──────────────────┐      │
│ PortfolioItem    │      │
├──────────────────┤      │
│ id: UUID         │      │
│ title: String    │◄─────┘ originates from
│ status: Status   │
│ demandId: FK     │
│ estimatedValue:  │
└──────────────────┘
         │
         │ justified by
         ▼
┌──────────────────┐      ┌──────────────────┐
│    Proposal      │      │   Investment     │
├──────────────────┤      ├──────────────────┤
│ id: UUID         │      │ id: UUID         │
│ title: String    │─────►│ title: String    │
│ businessCase: Txt│      │ budget: Decimal  │
│ roi: Decimal     │      │ spent: Decimal   │
│ portfolioItemId  │      │ proposalId: FK   │
└──────────────────┘      │ status: Status   │
                          └──────────────────┘
                                   │
                                   │ tracked on
                                   ▼
                          ┌──────────────────┐
                          │RoadmapMilestone  │
                          ├──────────────────┤
                          │ id: UUID         │
                          │ title: String    │
                          │ targetDate: Date │
                          │ investmentId: FK │
                          │ status: Status   │
                          └──────────────────┘
```

### TypeScript Interfaces

```typescript
// src/types/s2p.ts

import { BaseEntity, Priority, UUID } from './common';

// ============ DEMAND ============

export type DemandStatus =
  | 'submitted'
  | 'under_review'
  | 'assessed'
  | 'approved'
  | 'rejected'
  | 'in_portfolio';

export type DemandCategory =
  | 'new_capability'
  | 'enhancement'
  | 'compliance'
  | 'infrastructure'
  | 'security'
  | 'optimization';

export interface Demand extends BaseEntity {
  title: string;
  description: string;
  status: DemandStatus;
  priority: Priority;
  category: DemandCategory;
  requestor: {
    name: string;
    email: string;
    department: string;
  };
  businessUnit: string;
  estimatedEffort: 'small' | 'medium' | 'large' | 'xlarge';
  estimatedValue: 'low' | 'medium' | 'high' | 'strategic';
  targetQuarter: string; // e.g., "Q2 2025"
  attachments: number;
  comments: number;
  tags: string[];
}

// ============ PORTFOLIO ITEM ============

export type PortfolioStatus =
  | 'proposed'
  | 'approved'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export type PortfolioType =
  | 'project'
  | 'program'
  | 'product'
  | 'initiative';

export interface PortfolioItem extends BaseEntity {
  title: string;
  description: string;
  status: PortfolioStatus;
  type: PortfolioType;
  priority: Priority;
  demandId?: UUID; // Origin demand
  owner: {
    name: string;
    email: string;
    role: string;
  };
  sponsor: string;
  businessUnit: string;
  startDate?: string;
  targetEndDate?: string;
  actualEndDate?: string;
  estimatedBudget: number;
  allocatedBudget: number;
  percentComplete: number;
  healthStatus: 'green' | 'yellow' | 'red';
  risks: number;
  dependencies: UUID[]; // Other portfolio items
  tags: string[];
}

// ============ PROPOSAL ============

export type ProposalStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'deferred';

export interface Proposal extends BaseEntity {
  title: string;
  description: string;
  status: ProposalStatus;
  portfolioItemId?: UUID;
  author: {
    name: string;
    email: string;
  };
  businessCase: {
    summary: string;
    problem: string;
    solution: string;
    alternatives: string[];
  };
  financials: {
    estimatedCost: number;
    estimatedBenefit: number;
    roi: number; // Percentage
    paybackPeriod: number; // Months
    npv: number;
  };
  timeline: {
    implementationMonths: number;
    startDate?: string;
    endDate?: string;
  };
  risks: Array<{
    description: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  approvers: Array<{
    name: string;
    role: string;
    decision?: 'approved' | 'rejected' | 'pending';
    date?: string;
    comments?: string;
  }>;
  attachments: number;
}

// ============ INVESTMENT ============

export type InvestmentStatus =
  | 'planned'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export type InvestmentCategory =
  | 'run'      // Keep the lights on
  | 'grow'     // Expand capabilities
  | 'transform'; // Strategic change

export interface Investment extends BaseEntity {
  title: string;
  description: string;
  status: InvestmentStatus;
  category: InvestmentCategory;
  proposalId?: UUID;
  owner: {
    name: string;
    email: string;
  };
  budget: {
    total: number;
    allocated: number;
    spent: number;
    forecast: number;
  };
  timeline: {
    fiscalYear: string;
    startDate: string;
    endDate: string;
    percentComplete: number;
  };
  metrics: {
    plannedBenefit: number;
    realizedBenefit: number;
    roi: number;
  };
  portfolioItems: UUID[];
  healthStatus: 'green' | 'yellow' | 'red';
  lastReviewDate: string;
}

// ============ ROADMAP ============

export type MilestoneStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'delayed'
  | 'at_risk'
  | 'cancelled';

export type MilestoneType =
  | 'release'
  | 'phase'
  | 'checkpoint'
  | 'decision'
  | 'dependency';

export interface RoadmapMilestone extends BaseEntity {
  title: string;
  description: string;
  status: MilestoneStatus;
  type: MilestoneType;
  investmentId?: UUID;
  portfolioItemId?: UUID;
  targetDate: string;
  actualDate?: string;
  owner: string;
  dependencies: UUID[]; // Other milestones
  deliverables: string[];
  progress: number; // 0-100
}

export interface RoadmapLane {
  id: UUID;
  name: string;
  color: string;
  items: RoadmapMilestone[];
}
```

---

## Requirement to Deploy (R2D)

### Entity Relationship Diagram

```
┌──────────────────┐
│   Requirement    │
├──────────────────┤
│ id: UUID         │
│ title: String    │
│ status: Status   │
│ releaseId: FK    │──────┐
└──────────────────┘      │
         │                │
         │ implemented by │
         ▼                │
┌──────────────────┐      │
│     Build        │      │
├──────────────────┤      │
│ id: UUID         │      │
│ version: String  │      │
│ status: Status   │      │
│ pipelineRunId:FK │      │
│ requirementIds   │      │
└──────────────────┘      │
         │                │
         │ part of        │
         ▼                │
┌──────────────────┐      │
│   PipelineRun    │      │
├──────────────────┤      │
│ id: UUID         │      │
│ pipelineId: FK   │      │
│ status: Status   │      │
│ stages: Array    │      │
└──────────────────┘      │
         │                │
         │ deploys        │
         ▼                ▼
┌──────────────────┐      ┌──────────────────┐
│   Deployment     │      │    Release       │
├──────────────────┤      ├──────────────────┤
│ id: UUID         │◄────►│ id: UUID         │
│ environmentId:FK │      │ version: String  │
│ releaseId: FK    │      │ status: Status   │
│ status: Status   │      │ deployments: []  │
└──────────────────┘      └──────────────────┘
         │
         │ targets
         ▼
┌──────────────────┐      ┌──────────────────┐
│  Environment     │      │    TestRun       │
├──────────────────┤      ├──────────────────┤
│ id: UUID         │      │ id: UUID         │
│ name: String     │      │ releaseId: FK    │
│ type: Enum       │      │ status: Status   │
│ status: Status   │      │ passRate: Num    │
│ services: []     │      │ results: []      │
└──────────────────┘      └──────────────────┘
```

### TypeScript Interfaces

```typescript
// src/types/r2d.ts

import { BaseEntity, Priority, UUID } from './common';

// ============ REQUIREMENT ============

export type RequirementStatus =
  | 'draft'
  | 'approved'
  | 'in_development'
  | 'in_testing'
  | 'ready'
  | 'deployed'
  | 'rejected';

export type RequirementType =
  | 'feature'
  | 'enhancement'
  | 'bug_fix'
  | 'technical_debt'
  | 'security';

export interface Requirement extends BaseEntity {
  title: string;
  description: string;
  status: RequirementStatus;
  type: RequirementType;
  priority: Priority;
  releaseId?: UUID;
  owner: {
    name: string;
    email: string;
  };
  acceptanceCriteria: string[];
  storyPoints?: number;
  linkedBuilds: UUID[];
  linkedTestCases: UUID[];
  tags: string[];
}

// ============ PIPELINE ============

export type PipelineStatus =
  | 'idle'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export interface Pipeline extends BaseEntity {
  name: string;
  description: string;
  repository: string;
  branch: string;
  trigger: 'manual' | 'push' | 'schedule' | 'pr';
  stages: PipelineStage[];
  lastRun?: PipelineRun;
  runs: number; // Total runs
  successRate: number; // Percentage
}

export interface PipelineStage {
  id: UUID;
  name: string;
  order: number;
  type: 'build' | 'test' | 'security' | 'deploy' | 'approval';
  environment?: string;
}

export interface PipelineRun extends BaseEntity {
  pipelineId: UUID;
  pipelineName: string;
  status: PipelineStatus;
  branch: string;
  commit: {
    sha: string;
    message: string;
    author: string;
  };
  triggeredBy: string;
  startedAt: string;
  finishedAt?: string;
  duration?: number; // Seconds
  stages: PipelineStageRun[];
  artifacts: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

export interface PipelineStageRun {
  stageId: UUID;
  name: string;
  status: PipelineStatus;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  logs?: string;
  error?: string;
}

// ============ BUILD ============

export type BuildStatus =
  | 'queued'
  | 'building'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export interface Build extends BaseEntity {
  buildNumber: string;
  version: string;
  status: BuildStatus;
  pipelineRunId?: UUID;
  repository: string;
  branch: string;
  commit: {
    sha: string;
    message: string;
    author: string;
  };
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  artifacts: Array<{
    name: string;
    size: number;
    url: string;
  }>;
  testResults?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  requirements: UUID[];
}

// ============ RELEASE ============

export type ReleaseStatus =
  | 'planning'
  | 'development'
  | 'testing'
  | 'staging'
  | 'ready'
  | 'deploying'
  | 'deployed'
  | 'rolled_back'
  | 'cancelled';

export type ReleaseType = 'major' | 'minor' | 'patch' | 'hotfix';

export interface Release extends BaseEntity {
  version: string;
  name: string;
  description: string;
  status: ReleaseStatus;
  type: ReleaseType;
  owner: {
    name: string;
    email: string;
  };
  plannedDate: string;
  actualDate?: string;
  requirements: UUID[];
  builds: UUID[];
  deployments: UUID[];
  testRuns: UUID[];
  changeRequests: UUID[];
  releaseNotes?: string;
  rollbackPlan?: string;
}

// ============ ENVIRONMENT ============

export type EnvironmentType =
  | 'development'
  | 'testing'
  | 'staging'
  | 'pre_production'
  | 'production';

export type EnvironmentStatus =
  | 'healthy'
  | 'degraded'
  | 'down'
  | 'maintenance';

export interface Environment extends BaseEntity {
  name: string;
  type: EnvironmentType;
  description: string;
  status: EnvironmentStatus;
  url?: string;
  region: string;
  services: ServiceInstance[];
  lastDeployment?: {
    releaseVersion: string;
    deployedAt: string;
    deployedBy: string;
  };
  metrics: {
    uptime: number; // Percentage
    responseTime: number; // ms
    errorRate: number; // Percentage
  };
  alerts: number;
}

export interface ServiceInstance {
  id: UUID;
  name: string;
  version: string;
  status: 'running' | 'stopped' | 'error';
  instances: number;
  cpu: number; // Percentage
  memory: number; // Percentage
}

// ============ TEST ============

export type TestStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'blocked';

export type TestType =
  | 'unit'
  | 'integration'
  | 'e2e'
  | 'performance'
  | 'security'
  | 'regression';

export interface TestCase extends BaseEntity {
  title: string;
  description: string;
  type: TestType;
  priority: Priority;
  requirementId?: UUID;
  steps: string[];
  expectedResult: string;
  automated: boolean;
  tags: string[];
}

export interface TestRun extends BaseEntity {
  name: string;
  status: TestStatus;
  releaseId?: UUID;
  buildId?: UUID;
  environment: string;
  type: TestType;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  results: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    blocked: number;
  };
  passRate: number;
  coverage?: number;
  testCases: TestCaseResult[];
}

export interface TestCaseResult {
  testCaseId: UUID;
  title: string;
  status: TestStatus;
  duration?: number;
  error?: string;
  screenshot?: string;
}
```

---

## Request to Fulfill (R2F)

### Entity Relationship Diagram

```
┌──────────────────┐      ┌──────────────────┐
│  CatalogEntry    │      │   OfferItem      │
├──────────────────┤      ├──────────────────┤
│ id: UUID         │◄────►│ id: UUID         │
│ name: String     │      │ name: String     │
│ category: Enum   │      │ catalogEntryId   │
│ status: Status   │      │ price: Decimal   │
│ offers: []       │      │ type: Enum       │
└──────────────────┘      └──────────────────┘
         │                         │
         │ requested via           │ purchased via
         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ ServiceRequest   │      │  Subscription    │
├──────────────────┤      ├──────────────────┤
│ id: UUID         │      │ id: UUID         │
│ catalogEntryId   │      │ offerItemId: FK  │
│ requestor: FK    │      │ userId: FK       │
│ status: Status   │      │ status: Status   │
└──────────────────┘      │ renewalDate: Date│
         │                └──────────────────┘
         │ fulfilled by
         ▼
┌──────────────────┐
│FulfillmentRequest│
├──────────────────┤
│ id: UUID         │
│ requestId: FK    │
│ assignee: String │
│ status: Status   │
│ slaTarget: Date  │
└──────────────────┘
```

### TypeScript Interfaces

```typescript
// src/types/r2f.ts

import { BaseEntity, Priority, UUID } from './common';

// ============ CATALOG ============

export type CatalogCategory =
  | 'hardware'
  | 'software'
  | 'access'
  | 'cloud'
  | 'support'
  | 'training'
  | 'communication'
  | 'security'
  | 'data'
  | 'other';

export type CatalogStatus = 'active' | 'inactive' | 'deprecated';

export interface CatalogEntry extends BaseEntity {
  name: string;
  shortDescription: string;
  fullDescription: string;
  category: CatalogCategory;
  subcategory?: string;
  status: CatalogStatus;
  icon?: string;
  image?: string;
  owner: {
    team: string;
    email: string;
  };
  supportHours: string;
  slaResponseTime: string;
  slaResolutionTime: string;
  availability: number; // Percentage
  popularity: number; // Request count
  rating: number; // 1-5
  offers: UUID[];
  relatedServices: UUID[];
  tags: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

// ============ OFFER ============

export type OfferType =
  | 'one_time'
  | 'subscription'
  | 'metered';

export type OfferStatus = 'available' | 'out_of_stock' | 'discontinued';

export interface OfferItem extends BaseEntity {
  name: string;
  description: string;
  catalogEntryId: UUID;
  type: OfferType;
  status: OfferStatus;
  price?: {
    amount: number;
    currency: string;
    period?: 'month' | 'year';
  };
  requiresApproval: boolean;
  approvers?: string[];
  fulfillmentTime: string; // e.g., "2-3 business days"
  specifications: Record<string, string>;
  maxQuantity?: number;
  stockLevel?: number;
}

// ============ SERVICE REQUEST ============

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'in_fulfillment'
  | 'fulfilled'
  | 'cancelled'
  | 'closed';

export interface ServiceRequest extends BaseEntity {
  requestNumber: string;
  catalogEntryId: UUID;
  catalogEntryName: string;
  offerItemId?: UUID;
  offerItemName?: string;
  status: RequestStatus;
  priority: Priority;
  requestor: {
    id: UUID;
    name: string;
    email: string;
    department: string;
  };
  description: string;
  quantity: number;
  justification?: string;
  requestedFor?: {
    name: string;
    email: string;
  };
  approvals: Array<{
    approver: string;
    status: 'pending' | 'approved' | 'rejected';
    date?: string;
    comments?: string;
  }>;
  targetDate?: string;
  fulfilledDate?: string;
  fulfillmentId?: UUID;
  attachments: number;
  comments: number;
}

// ============ FULFILLMENT ============

export type FulfillmentStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'pending_info'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface FulfillmentRequest extends BaseEntity {
  fulfillmentNumber: string;
  serviceRequestId: UUID;
  serviceRequestNumber: string;
  status: FulfillmentStatus;
  priority: Priority;
  assignee?: {
    name: string;
    email: string;
    team: string;
  };
  requestor: {
    name: string;
    email: string;
  };
  catalogItem: string;
  description: string;
  sla: {
    targetDate: string;
    breached: boolean;
    remainingTime?: number; // Minutes
  };
  tasks: Array<{
    id: UUID;
    title: string;
    status: 'pending' | 'in_progress' | 'completed';
    assignee?: string;
  }>;
  notes: string[];
  startedAt?: string;
  completedAt?: string;
}

// ============ SUBSCRIPTION ============

export type SubscriptionStatus =
  | 'active'
  | 'pending'
  | 'suspended'
  | 'cancelled'
  | 'expired';

export interface Subscription extends BaseEntity {
  subscriptionNumber: string;
  offerItemId: UUID;
  offerItemName: string;
  catalogEntryName: string;
  status: SubscriptionStatus;
  subscriber: {
    id: UUID;
    name: string;
    email: string;
    department: string;
  };
  startDate: string;
  endDate?: string;
  renewalDate?: string;
  autoRenew: boolean;
  billing: {
    amount: number;
    currency: string;
    period: 'month' | 'year';
    lastBilled?: string;
    nextBilling?: string;
  };
  usage?: {
    current: number;
    limit?: number;
    unit: string;
  };
  features: string[];
}
```

---

## Detect to Correct (D2C)

### Entity Relationship Diagram

```
┌──────────────────┐
│     Event        │
├──────────────────┤
│ id: UUID         │
│ source: String   │──────┐
│ severity: Enum   │      │
│ status: Status   │      │ creates
└──────────────────┘      │
                          ▼
┌──────────────────┐      ┌──────────────────┐
│    Problem       │◄────►│    Incident      │
├──────────────────┤      ├──────────────────┤
│ id: UUID         │      │ id: UUID         │
│ title: String    │      │ title: String    │
│ status: Status   │      │ severity: Enum   │
│ rootCause: String│      │ status: Status   │
│ incidents: []    │      │ assignee: String │
└──────────────────┘      │ problemId: FK    │
         │                │ relatedCIs: []   │
         │                └──────────────────┘
         │ documents             │
         ▼                       │ resolved by
┌──────────────────┐             │
│   KnownError     │             │
├──────────────────┤             ▼
│ id: UUID         │      ┌──────────────────┐
│ title: String    │      │    Change        │
│ workaround: Text │      ├──────────────────┤
│ problemId: FK    │      │ id: UUID         │
│ affectedCIs: []  │      │ title: String    │
└──────────────────┘      │ type: Enum       │
                          │ status: Status   │
                          │ affectedCIs: []  │
                          │ scheduledStart   │
                          └──────────────────┘
                                   │
                                   │ impacts
                                   ▼
                          ┌──────────────────┐
                          │ConfigurationItem │
                          ├──────────────────┤
                          │ id: UUID         │
                          │ name: String     │
                          │ type: Enum       │
                          │ status: Status   │
                          │ relationships: []│
                          └──────────────────┘
```

### TypeScript Interfaces

```typescript
// src/types/d2c.ts

import { BaseEntity, Priority, Severity, UUID } from './common';

// ============ EVENT ============

export type EventSeverity = 'critical' | 'major' | 'minor' | 'warning' | 'info';

export type EventStatus = 'new' | 'acknowledged' | 'resolved' | 'closed';

export type EventSource =
  | 'monitoring'
  | 'alerting'
  | 'user_reported'
  | 'automated'
  | 'integration';

export interface Event extends BaseEntity {
  eventId: string; // System-generated ID
  title: string;
  description: string;
  severity: EventSeverity;
  status: EventStatus;
  source: EventSource;
  sourceSystem: string;
  category: string;
  subcategory?: string;
  affectedCI?: UUID;
  affectedCIName?: string;
  count: number; // Occurrence count
  firstOccurrence: string;
  lastOccurrence: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  correlatedIncident?: UUID;
  rawData?: Record<string, unknown>;
  tags: string[];
}

// ============ INCIDENT ============

export type IncidentStatus =
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'pending'
  | 'resolved'
  | 'closed';

export type IncidentCategory =
  | 'hardware'
  | 'software'
  | 'network'
  | 'security'
  | 'access'
  | 'performance'
  | 'availability'
  | 'other';

export interface Incident extends BaseEntity {
  incidentNumber: string;
  title: string;
  description: string;
  severity: Severity;
  priority: Priority;
  status: IncidentStatus;
  category: IncidentCategory;
  subcategory?: string;
  reportedBy: {
    name: string;
    email: string;
    phone?: string;
  };
  assignee?: {
    name: string;
    email: string;
    team: string;
  };
  assignmentGroup: string;
  affectedUsers: number;
  affectedService?: string;
  impactDescription: string;
  sla: {
    responseTarget: string;
    resolutionTarget: string;
    responseBreached: boolean;
    resolutionBreached: boolean;
    remainingTime?: number; // Minutes
  };
  timeline: Array<{
    timestamp: string;
    action: string;
    user: string;
    details?: string;
  }>;
  relatedCIs: UUID[];
  relatedChanges: UUID[];
  parentProblem?: UUID;
  childIncidents: UUID[];
  resolvedAt?: string;
  closedAt?: string;
  resolution?: string;
  rootCause?: string;
  workaround?: string;
  attachments: number;
  comments: number;
}

// ============ PROBLEM ============

export type ProblemStatus =
  | 'new'
  | 'under_investigation'
  | 'root_cause_identified'
  | 'known_error'
  | 'pending_change'
  | 'resolved'
  | 'closed';

export interface Problem extends BaseEntity {
  problemNumber: string;
  title: string;
  description: string;
  status: ProblemStatus;
  priority: Priority;
  category: IncidentCategory;
  owner: {
    name: string;
    email: string;
    team: string;
  };
  affectedService: string;
  impactAssessment: string;
  rootCauseAnalysis?: string;
  rootCause?: string;
  workaround?: string;
  permanentFix?: string;
  relatedIncidents: UUID[];
  relatedChanges: UUID[];
  relatedCIs: UUID[];
  knownErrorId?: UUID;
  targetResolutionDate?: string;
  actualResolutionDate?: string;
  tasks: Array<{
    id: UUID;
    title: string;
    status: 'pending' | 'in_progress' | 'completed';
    assignee?: string;
    dueDate?: string;
  }>;
  attachments: number;
  comments: number;
}

// ============ CHANGE ============

export type ChangeType =
  | 'standard'
  | 'normal'
  | 'emergency';

export type ChangeStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'implementing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ChangeRisk = 'low' | 'medium' | 'high' | 'critical';

export interface Change extends BaseEntity {
  changeNumber: string;
  title: string;
  description: string;
  type: ChangeType;
  status: ChangeStatus;
  priority: Priority;
  risk: ChangeRisk;
  impact: 'low' | 'medium' | 'high';
  requestedBy: {
    name: string;
    email: string;
  };
  assignee: {
    name: string;
    email: string;
    team: string;
  };
  category: string;
  reason: string;
  implementationPlan: string;
  testPlan?: string;
  rollbackPlan: string;
  schedule: {
    plannedStart: string;
    plannedEnd: string;
    actualStart?: string;
    actualEnd?: string;
    outageRequired: boolean;
    outageWindow?: {
      start: string;
      end: string;
    };
  };
  approvals: Array<{
    approver: string;
    role: string;
    status: 'pending' | 'approved' | 'rejected';
    date?: string;
    comments?: string;
  }>;
  affectedCIs: UUID[];
  affectedServices: string[];
  relatedIncidents: UUID[];
  relatedProblems: UUID[];
  tasks: Array<{
    id: UUID;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    assignee?: string;
    order: number;
  }>;
  postImplementationReview?: {
    successful: boolean;
    lessonsLearned?: string;
    reviewedBy?: string;
    reviewedAt?: string;
  };
  attachments: number;
  comments: number;
}

// ============ KNOWN ERROR ============

export interface KnownError extends BaseEntity {
  knownErrorNumber: string;
  title: string;
  description: string;
  status: 'active' | 'resolved' | 'retired';
  problemId?: UUID;
  rootCause: string;
  workaround: string;
  permanentFixAvailable: boolean;
  permanentFix?: string;
  fixTargetDate?: string;
  affectedCIs: UUID[];
  affectedServices: string[];
  symptoms: string[];
  relatedIncidents: UUID[];
  owner: {
    name: string;
    email: string;
  };
}

// ============ CONFIGURATION ITEM ============

export type CIType =
  | 'server'
  | 'network_device'
  | 'storage'
  | 'database'
  | 'application'
  | 'service'
  | 'virtual_machine'
  | 'container'
  | 'load_balancer'
  | 'firewall'
  | 'workstation'
  | 'mobile_device'
  | 'other';

export type CIStatus =
  | 'active'
  | 'inactive'
  | 'maintenance'
  | 'decommissioned'
  | 'planned';

export type CIRelationshipType =
  | 'depends_on'
  | 'runs_on'
  | 'connected_to'
  | 'managed_by'
  | 'part_of'
  | 'uses';

export interface ConfigurationItem extends BaseEntity {
  ciNumber: string;
  name: string;
  type: CIType;
  status: CIStatus;
  description?: string;
  environment: 'production' | 'staging' | 'development' | 'test';
  location?: {
    datacenter?: string;
    rack?: string;
    region?: string;
  };
  owner: {
    team: string;
    contact: string;
  };
  supportGroup: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  attributes: Record<string, string | number | boolean>;
  relationships: Array<{
    type: CIRelationshipType;
    targetCIId: UUID;
    targetCIName: string;
  }>;
  services: string[];
  lastDiscovered?: string;
  lastAudit?: string;
  tags: string[];
}
```

---

## Dashboard Metrics Types

```typescript
// src/types/metrics.ts

import { KPIMetric, TimeSeriesDataPoint } from './common';

export interface ExecutiveDashboardData {
  summary: {
    totalDemands: number;
    totalIncidents: number;
    totalChanges: number;
    totalRequests: number;
  };
  valueStreams: {
    s2p: ValueStreamSummary;
    r2d: ValueStreamSummary;
    r2f: ValueStreamSummary;
    d2c: ValueStreamSummary;
  };
  alerts: DashboardAlert[];
}

export interface ValueStreamSummary {
  name: string;
  health: 'healthy' | 'warning' | 'critical';
  kpis: KPIMetric[];
  recentActivity: number;
}

export interface DashboardAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  valueStream: 's2p' | 'r2d' | 'r2f' | 'd2c';
  timestamp: string;
  link?: string;
}

export interface S2PDashboardData {
  kpis: {
    totalDemands: KPIMetric;
    approvalRate: KPIMetric;
    avgCycleTime: KPIMetric;
    portfolioValue: KPIMetric;
  };
  demandsByStatus: Record<string, number>;
  demandTrend: TimeSeriesDataPoint[];
  topInvestments: Array<{
    name: string;
    value: number;
    percentComplete: number;
  }>;
}

export interface R2DDashboardData {
  kpis: {
    pipelineSuccessRate: KPIMetric;
    deploymentFrequency: KPIMetric;
    leadTime: KPIMetric;
    changeFailureRate: KPIMetric;
  };
  pipelineStatus: Record<string, number>;
  releaseCalendar: Array<{
    date: string;
    releases: number;
  }>;
  environmentHealth: Array<{
    name: string;
    status: string;
    uptime: number;
  }>;
}

export interface R2FDashboardData {
  kpis: {
    totalRequests: KPIMetric;
    fulfillmentRate: KPIMetric;
    avgFulfillmentTime: KPIMetric;
    satisfaction: KPIMetric;
  };
  requestsByStatus: Record<string, number>;
  requestTrend: TimeSeriesDataPoint[];
  topServices: Array<{
    name: string;
    requests: number;
  }>;
}

export interface D2CDashboardData {
  kpis: {
    openIncidents: KPIMetric;
    mttr: KPIMetric;
    changeSuccessRate: KPIMetric;
    slaCompliance: KPIMetric;
  };
  incidentsBySeverity: Record<string, number>;
  incidentTrend: TimeSeriesDataPoint[];
  upcomingChanges: Array<{
    id: string;
    title: string;
    scheduledDate: string;
    risk: string;
  }>;
}
```

---

## Related Documents

- [Architecture](./architecture.md)
- [ADR-004: Mock Data Strategy](./ADRs/ADR-004-mock-data-strategy.md)
- [PRD](./PRD.md)
