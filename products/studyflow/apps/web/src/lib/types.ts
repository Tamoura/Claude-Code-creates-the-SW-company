// StudyFlow shared domain types — mirror the API.md (v1) contract shapes.

export type MetricType = 'numeric' | 'boolean' | 'percentage';
export type Cadence = 'daily' | 'weekly';
export type GoalStatus =
  | 'draft'
  | 'active'
  | 'at_risk'
  | 'completed'
  | 'abandoned';

export interface Student {
  id: string;
  email: string;
  activeTerm: string;
}

export interface Subject {
  id: string;
  code?: string | null;
  name: string;
  credits?: number | null;
  workload?: string | null;
  term?: string | null;
  prerequisites?: string | null;
  description?: string | null;
  isSeed: boolean;
}

export interface Selection {
  id: string;
  term: string;
  prereqWarningAck?: boolean;
  subject: Subject;
  goalCount: number;
}

export interface PrerequisiteWarning {
  unmet: string[];
}

export interface Goal {
  id: string;
  selectionId: string;
  title: string;
  metricType: MetricType;
  target: number;
  cadence: Cadence;
  dueDate: string;
  status: GoalStatus;
  completionPct: number;
  streak: number;
  atRisk?: boolean;
}

export interface ProgressEntry {
  id: string;
  goalId: string;
  entryDate: string;
  value: number;
  note?: string | null;
  createdAt?: string;
}

export interface GoalDetail extends Goal {
  atRisk: boolean;
  progressEntries: ProgressEntry[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ListEnvelope<T> {
  data: T[];
  pagination?: Pagination;
}

export type ReminderKind = 'due_soon' | 'streak_at_risk' | 'at_risk';

export interface Reminder {
  goalId: string;
  title: string;
  kind: ReminderKind;
  dueDate?: string;
  completionPct?: number;
  message: string;
}

export interface DashboardSelection {
  id: string;
  subject: Subject;
  goalCount: number;
  avgCompletionPct: number;
}

export interface DashboardGoal {
  id: string;
  title: string;
  completionPct: number;
  streak: number;
  status: GoalStatus;
  dueDate: string;
}

export interface Dashboard {
  activeTerm: string;
  selections: DashboardSelection[];
  activeGoals: DashboardGoal[];
  aggregate: {
    totalGoals: number;
    completedGoals: number;
    overallCompletionPct: number;
  };
  reminders: Reminder[];
}
