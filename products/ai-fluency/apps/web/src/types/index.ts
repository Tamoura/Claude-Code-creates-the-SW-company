// Shared frontend types for AI Fluency

export type UserRole = 'learner' | 'manager' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
