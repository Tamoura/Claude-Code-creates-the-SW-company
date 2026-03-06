// Shared frontend types for AI Fluency
// Aligned with backend enum casing (UPPER_CASE)

export type UserRole = 'LEARNER' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  orgId: string;
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
  status: 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'ABANDONED';
  startedAt: string;
  completedAt?: string;
  progressPct: number;
}

export interface FluencyProfile {
  userId: string;
  overallScore: number;
  dimensionScores: DimensionScores;
  lastAssessedAt: string;
}

export interface LearningPath {
  id: string;
  title?: string;
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  estimatedHours: number;
  progressPct: number;
  moduleCount?: number;
  completionPercent?: number;
  modules: LearningPathModule[];
}

export interface LearningPathModule {
  id: string;
  sequence: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  module: LearningModule;
}

export interface LearningModule {
  id: string;
  title: string;
  dimension?: Dimension;
  contentType?: string;
  type?: string;
  estimatedMinutes?: number;
  durationMinutes?: number;
  difficulty?: number;
  contentUrl?: string;
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

// Assessment question types

export type Dimension = 'DELEGATION' | 'DESCRIPTION' | 'DISCERNMENT' | 'DILIGENCE';

export interface ScenarioOption {
  key: string;
  text: string;
}

export interface LikertScale {
  min: number;
  max: number;
  labels: string[];
}

export interface Question {
  id: string;
  dimension: Dimension;
  questionType: 'SCENARIO' | 'SELF_REPORT';
  text: string;
  optionsJson: ScenarioOption[] | LikertScale;
  indicatorId: string;
}

export interface AssessmentResponse {
  questionId: string;
  answer: string;
}

export interface DimensionScores {
  DELEGATION: number;
  DESCRIPTION: number;
  DISCERNMENT: number;
  DILIGENCE: number;
}

export interface DetailedFluencyProfile extends FluencyProfile {
  id: string;
  sessionId: string;
  dimensionScores: DimensionScores;
  selfReportScores: DimensionScores;
  discernmentGap: boolean;
  createdAt: string;
}

export interface AIFeedback {
  summary: string;
  dimensionFeedback: Record<string, string>;
  topStrengths: string[];
  priorityImprovements: string[];
  discernmentGapWarning?: string;
  recommendedNextSteps: string[];
}
