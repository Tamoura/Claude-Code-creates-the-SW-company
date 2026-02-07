// API response types for Pulse mobile app

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  detail: string;
}

export interface RiskData {
  score: number;
  level: 'low' | 'medium' | 'high';
  explanation: string;
  factors: RiskFactor[];
  calculatedAt: string;
}

export interface RiskSnapshot {
  score: number;
  level: 'low' | 'medium' | 'high';
  calculatedAt: string;
}

export interface RiskHistoryData {
  teamId: string;
  snapshots: RiskSnapshot[];
}

export interface VelocityData {
  prsMerged: number;
  prsMergedTrend: number;
  avgCycleTime: number;
  avgCycleTimeTrend: number;
  avgReviewTime: number;
  avgReviewTimeTrend: number;
}

export interface CoverageData {
  current: number;
  trend: number;
  history: Array<{
    date: string;
    value: number;
  }>;
}

export interface MetricsSummary {
  velocity: VelocityData;
  coverage: CoverageData;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  activeRepos: number;
  teamMembers: number;
}

export type ActivityEventType =
  | 'push'
  | 'pr_opened'
  | 'pr_merged'
  | 'pr_closed'
  | 'deployment'
  | 'review'
  | 'comment';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  author: string;
  title: string;
  repo: string;
  time: string;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  language: string;
  defaultBranch: string;
  status: 'active' | 'syncing' | 'error';
}

export interface WebSocketMessage {
  type: 'auth' | 'subscribe' | 'activity' | 'error' | 'pong';
  token?: string;
  room?: string;
  data?: ActivityEvent;
  message?: string;
}
