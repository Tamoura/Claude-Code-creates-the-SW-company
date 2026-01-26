/**
 * Detect to Correct (D2C) Value Stream Types
 */

export type IncidentStatus = "new" | "assigned" | "in_progress" | "pending" | "resolved" | "closed";
export type IncidentSeverity = 1 | 2 | 3 | 4; // 1=Critical, 4=Low
export type IncidentPriority = 1 | 2 | 3 | 4; // 1=Urgent, 4=Low

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  priority: IncidentPriority;
  assignee: string;
  affectedService: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  relatedCIs: string[];
}

export type ProblemStatus = "new" | "investigating" | "known_error" | "resolved" | "closed";

export interface Problem {
  id: string;
  title: string;
  description: string;
  status: ProblemStatus;
  priority: number;
  assignee: string;
  relatedIncidents: string[];
  rootCause?: string;
  workaround?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ChangeStatus = "draft" | "submitted" | "approved" | "scheduled" | "implementing" | "completed" | "failed" | "cancelled";
export type ChangeRisk = "low" | "medium" | "high" | "critical";
export type ChangeType = "standard" | "normal" | "emergency";

export interface Change {
  id: string;
  title: string;
  description: string;
  status: ChangeStatus;
  type: ChangeType;
  risk: ChangeRisk;
  requestor: string;
  implementer: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  affectedCIs: string[];
}

export interface KnownError {
  id: string;
  title: string;
  description: string;
  rootCause: string;
  workaround: string;
  permanentFix?: string;
  relatedIncidents: string[];
  relatedProblems: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type EventSeverity = "info" | "warning" | "error" | "critical";

export interface Event {
  id: string;
  title: string;
  description: string;
  severity: EventSeverity;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  relatedCI?: string;
}
