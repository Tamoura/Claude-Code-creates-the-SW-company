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
    conceptual: number;
    practical: number;
    critical: number;
    collaborative: number;
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
