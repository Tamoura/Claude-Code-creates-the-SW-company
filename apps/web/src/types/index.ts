export type Priority = 'P1' | 'P2' | 'P3' | 'P4';
export type Impact = 'HIGH' | 'MEDIUM' | 'LOW';
export type Urgency = 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'PENDING'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'CLOSED';
export type SLAStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'MET' | 'PAUSED';
export type ProblemStatus =
  | 'NEW'
  | 'UNDER_INVESTIGATION'
  | 'KNOWN_ERROR'
  | 'RESOLVED'
  | 'CLOSED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  type: string;
}

export interface Incident {
  id: string;
  displayId: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: Priority;
  impact: Impact;
  urgency: Urgency;
  categoryId: string;
  category?: Category;
  reportedById: string;
  reportedBy?: User;
  assigneeId?: string;
  assignee?: User;
  affectedUserId?: string;
  affectedUser?: User;
  responseSlaDue?: string;
  resolutionSlaDue?: string;
  responseSlaStatus: SLAStatus;
  resolutionSlaStatus: SLAStatus;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentInput {
  title: string;
  description: string;
  priority: Priority;
  impact: Impact;
  urgency: Urgency;
  categoryId: string;
  reportedById: string;
  affectedUserId?: string;
  assigneeId?: string;
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  status?: IncidentStatus;
  priority?: Priority;
  impact?: Impact;
  urgency?: Urgency;
  categoryId?: string;
  assigneeId?: string;
  resolutionNotes?: string;
}

export interface Problem {
  id: string;
  displayId: string;
  title: string;
  description: string;
  status: ProblemStatus;
  priority: Priority;
  categoryId: string;
  category?: Category;
  createdById: string;
  createdBy?: User;
  assigneeId?: string;
  assignee?: User;
  rootCause?: string;
  workaround?: string;
  permanentFix?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    problemIncidents: number;
  };
}

export interface CreateProblemInput {
  title: string;
  description: string;
  priority: Priority;
  categoryId: string;
  createdById: string;
  assigneeId?: string;
  rootCause?: string;
  workaround?: string;
  permanentFix?: string;
}

export interface UpdateProblemInput {
  title?: string;
  description?: string;
  status?: ProblemStatus;
  priority?: Priority;
  categoryId?: string;
  assigneeId?: string;
  rootCause?: string;
  workaround?: string;
  permanentFix?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
