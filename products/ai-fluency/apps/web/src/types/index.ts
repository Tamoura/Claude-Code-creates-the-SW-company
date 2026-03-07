// Shared frontend types for AI Fluency

export type UserRole = 'learner' | 'manager' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  orgId?: string;
  organizationId?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
}

export interface AssessmentSession {
  id: string;
  userId: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt?: string;
  score?: number;
}

export interface FluencyProfile {
  userId: string;
  overallScore: number;
  dimensions: {
    DELEGATION: number;
    DESCRIPTION: number;
    DISCERNMENT: number;
    DILIGENCE: number;
  };
  lastAssessedAt: string;
}

export type QuestionType = 'SCENARIO' | 'SELF_REPORT';
export type DimensionKey = 'DELEGATION' | 'DESCRIPTION' | 'DISCERNMENT' | 'DILIGENCE';

export interface AssessmentQuestion {
  id: string;
  dimension: DimensionKey;
  type: QuestionType;
  text: string;
  options?: { key: string; text: string }[];
  order: number;
}

export interface AssessmentResponse {
  questionId: string;
  answer: string;
}

export interface DimensionScore {
  dimension: DimensionKey;
  score: number;
  status: 'pass' | 'partial' | 'fail';
}

export interface AssessmentResults {
  sessionId: string;
  overallScore: number;
  dimensions: DimensionScore[];
  discernmentGap?: number;
  completedAt: string;
}

export interface DashboardData {
  user: User;
  profile: FluencyProfile | null;
  assessmentCount: number;
  latestSession: AssessmentSession | null;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  moduleCount: number;
  completionPercent: number;
}

export interface LearningModule {
  id: string;
  pathId: string;
  title: string;
  description: string;
  durationMinutes: number;
  type: 'video' | 'reading' | 'exercise' | 'quiz';
  completedAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  domain: string;
  learnerCount: number;
  avgFluencyScore: number;
}

export interface Team {
  id: string;
  name: string;
  managerId: string;
  memberCount: number;
  avgFluencyScore: number;
}
