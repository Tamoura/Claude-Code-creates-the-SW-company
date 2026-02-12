/**
 * API Client for Mu'aththir backend
 *
 * Communicates with the Fastify API at http://localhost:5005.
 * Uses the TokenManager for XSS-safe JWT storage.
 */

import { TokenManager } from './token-manager';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005';

// ==================== Auth Types ====================

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ==================== Profile Types ====================

export interface Profile {
  id: string;
  name: string;
  email: string;
  subscriptionTier: string;
  createdAt: string;
  childCount: number;
}

// ==================== Domain Types ====================

export interface Child {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | null;
  ageBand: string | null;
  photoUrl: string | null;
  medicalNotes: string | null;
  allergies: string[] | null;
  specialNeeds: string | null;
  createdAt: string;
  updatedAt: string;
  observationCount?: number;
  milestoneProgress?: { total: number; achieved: number };
}

export interface Observation {
  id: string;
  childId: string;
  dimension: string;
  content: string;
  sentiment: string;
  observedAt: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneDefinition {
  id: string;
  dimension: string;
  ageBand: string;
  title: string;
  description: string;
  guidance: string | null;
  sortOrder: number;
}

export interface ChildMilestone extends MilestoneDefinition {
  achieved: boolean;
  achievedAt: string | null;
  achievedHistory: unknown;
}

export interface DimensionScore {
  dimension: string;
  score: number;
  factors: { observation: number; milestone: number; sentiment: number };
  observationCount: number;
  milestoneProgress: { achieved: number; total: number };
}

export interface DashboardData {
  childId: string;
  childName: string;
  ageBand: string | null;
  overallScore: number;
  dimensions: DimensionScore[];
  calculatedAt: string;
}

export interface Goal {
  id: string;
  childId: string;
  dimension: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface GoalTemplate {
  id: string;
  dimension: string;
  ageBand: string;
  title: string;
  description: string;
}

export interface InsightStrength {
  dimension: string;
  title: string;
  detail: string;
  score: number;
}

export interface InsightGrowthArea {
  dimension: string;
  title: string;
  detail: string;
  score: number;
  suggestions: string[];
}

export interface InsightRecommendation {
  type: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export interface InsightsData {
  childId: string;
  childName: string;
  generatedAt: string;
  summary: string;
  strengths: InsightStrength[];
  areasForGrowth: InsightGrowthArea[];
  recommendations: InsightRecommendation[];
  trends: {
    overallDirection: string;
    dimensionTrends: Record<string, string>;
  };
}

export interface ReportSummaryData {
  childId: string;
  childName: string;
  ageBand: string | null;
  generatedAt: string;
  dateRange: { from: string; to: string };
  overallScore: number;
  dimensions: DimensionScore[];
  insights: {
    summary: string;
    strengths: InsightStrength[];
    areasForGrowth: InsightGrowthArea[];
    recommendations: InsightRecommendation[];
    trends: { overallDirection: string; dimensionTrends: Record<string, string> };
  };
  recentObservations: Observation[];
  milestoneProgress: {
    totalAchieved: number;
    totalAvailable: number;
    byDimension: Record<string, { achieved: number; total: number }>;
  };
  goals: { active: number; completed: number; paused: number };
  observationsByDimension: Record<string, number>;
}

export interface FamilyShare {
  id: string;
  parentId: string;
  inviteeEmail: string;
  inviteeId: string | null;
  role: 'viewer' | 'contributor';
  status: 'pending' | 'accepted' | 'declined';
  childIds: string[];
  invitedAt: string;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPrefs {
  dailyReminder: boolean;
  weeklyDigest: boolean;
  milestoneAlerts: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ==================== API Client ====================

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    timeoutMs = 15000
  ): Promise<T> {
    const token = TokenManager.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only set Content-Type for requests that have a body
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          detail: 'Request failed',
        }));
        throw new Error(error.detail || error.message || `HTTP ${response.status}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return response.json();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ==================== Auth ====================

  async signup(payload: SignupPayload): Promise<LoginResponse> {
    const result = await this.request<LoginResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    TokenManager.setToken(result.accessToken);
    return result;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const result = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    TokenManager.setToken(result.accessToken);
    return result;
  }

  async demoLogin(): Promise<LoginResponse> {
    const result = await this.request<LoginResponse>('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    TokenManager.setToken(result.accessToken);
    return result;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      TokenManager.clearToken();
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(
    token: string,
    password: string
  ): Promise<{ message: string }> {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // ==================== Children ====================

  async getChildren(page = 1, limit = 50): Promise<PaginatedResponse<Child>> {
    return this.request(`/api/children?page=${page}&limit=${limit}`);
  }

  async getChild(id: string): Promise<Child> {
    return this.request(`/api/children/${id}`);
  }

  async createChild(data: {
    name: string;
    dateOfBirth: string;
    gender?: 'male' | 'female';
    medicalNotes?: string;
    allergies?: string[];
    specialNeeds?: string;
  }): Promise<Child> {
    return this.request('/api/children', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChild(
    id: string,
    data: {
      name?: string;
      dateOfBirth?: string;
      gender?: 'male' | 'female' | null;
      medicalNotes?: string | null;
      allergies?: string[] | null;
      specialNeeds?: string | null;
    }
  ): Promise<Child> {
    return this.request(`/api/children/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteChild(id: string): Promise<void> {
    return this.request(`/api/children/${id}`, { method: 'DELETE' });
  }

  async uploadChildPhoto(childId: string, file: File): Promise<Child> {
    const token = TokenManager.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const formData = new FormData();
    formData.append('photo', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        `${this.baseUrl}/api/children/${childId}/photo`,
        {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include',
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          detail: 'Upload failed',
        }));
        throw new Error(error.detail || error.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Upload timed out. Please try again.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ==================== Observations ====================

  async getObservations(
    childId: string,
    params?: {
      page?: number;
      limit?: number;
      dimension?: string;
      sentiment?: string;
      from?: string;
      to?: string;
    }
  ): Promise<PaginatedResponse<Observation>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.dimension) query.set('dimension', params.dimension);
    if (params?.sentiment) query.set('sentiment', params.sentiment);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const qs = query.toString();
    return this.request(
      `/api/children/${childId}/observations${qs ? `?${qs}` : ''}`
    );
  }

  async getObservation(childId: string, id: string): Promise<Observation> {
    return this.request(`/api/children/${childId}/observations/${id}`);
  }

  async createObservation(
    childId: string,
    data: {
      dimension: string;
      content: string;
      sentiment: string;
      observedAt?: string;
      tags?: string[];
    }
  ): Promise<Observation> {
    return this.request(`/api/children/${childId}/observations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateObservation(
    childId: string,
    id: string,
    data: {
      content?: string;
      sentiment?: string;
      observedAt?: string;
      tags?: string[];
    }
  ): Promise<Observation> {
    return this.request(`/api/children/${childId}/observations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteObservation(childId: string, id: string): Promise<void> {
    return this.request(`/api/children/${childId}/observations/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== Milestones ====================

  async getMilestones(params?: {
    page?: number;
    limit?: number;
    dimension?: string;
    ageBand?: string;
  }): Promise<PaginatedResponse<MilestoneDefinition>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.dimension) query.set('dimension', params.dimension);
    if (params?.ageBand) query.set('ageBand', params.ageBand);
    const qs = query.toString();
    return this.request(`/api/milestones${qs ? `?${qs}` : ''}`);
  }

  async getChildMilestones(
    childId: string,
    params?: { dimension?: string; ageBand?: string; page?: number; limit?: number }
  ): Promise<PaginatedResponse<ChildMilestone>> {
    const query = new URLSearchParams();
    if (params?.dimension) query.set('dimension', params.dimension);
    if (params?.ageBand) query.set('ageBand', params.ageBand);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.request(
      `/api/children/${childId}/milestones${qs ? `?${qs}` : ''}`
    );
  }

  async toggleMilestone(
    childId: string,
    milestoneId: string,
    achieved: boolean
  ): Promise<ChildMilestone> {
    return this.request(
      `/api/children/${childId}/milestones/${milestoneId}`,
      { method: 'PATCH', body: JSON.stringify({ achieved }) }
    );
  }

  // ==================== Dashboard ====================

  async getDashboard(childId: string): Promise<DashboardData> {
    return this.request(`/api/dashboard/${childId}`);
  }

  async getRecentObservations(
    childId: string
  ): Promise<{ data: Observation[] }> {
    return this.request(`/api/dashboard/${childId}/recent`);
  }

  async getMilestonesDue(
    childId: string
  ): Promise<{ data: MilestoneDefinition[] }> {
    return this.request(`/api/dashboard/${childId}/milestones-due`);
  }

  async getActivityFeed(
    childId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<{ data: Array<{ type: string; timestamp: string; [key: string]: unknown }> }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return this.request(`/api/dashboard/${childId}/activity${qs ? `?${qs}` : ''}`);
  }

  // ==================== Goals ====================

  async getGoals(
    childId: string,
    params?: { dimension?: string; status?: string; page?: number; limit?: number }
  ): Promise<PaginatedResponse<Goal>> {
    const query = new URLSearchParams();
    if (params?.dimension) query.set('dimension', params.dimension);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.request(
      `/api/children/${childId}/goals${qs ? `?${qs}` : ''}`
    );
  }

  async getGoal(childId: string, goalId: string): Promise<Goal> {
    return this.request(`/api/children/${childId}/goals/${goalId}`);
  }

  async createGoal(
    childId: string,
    data: {
      title: string;
      dimension: string;
      description?: string;
      targetDate?: string;
    }
  ): Promise<Goal> {
    return this.request(`/api/children/${childId}/goals`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGoal(
    childId: string,
    goalId: string,
    data: {
      title?: string;
      dimension?: string;
      description?: string;
      targetDate?: string;
      status?: 'active' | 'completed' | 'paused';
    }
  ): Promise<Goal> {
    return this.request(`/api/children/${childId}/goals/${goalId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteGoal(childId: string, goalId: string): Promise<void> {
    return this.request(`/api/children/${childId}/goals/${goalId}`, {
      method: 'DELETE',
    });
  }

  // ==================== Goal Templates ====================

  async getGoalTemplates(params?: {
    dimension?: string;
    ageBand?: string;
  }): Promise<GoalTemplate[]> {
    const query = new URLSearchParams();
    if (params?.dimension) query.set('dimension', params.dimension);
    if (params?.ageBand) query.set('ageBand', params.ageBand);
    const qs = query.toString();
    return this.request(`/api/goal-templates${qs ? `?${qs}` : ''}`);
  }

  // ==================== Insights ====================

  async getInsights(childId: string): Promise<InsightsData> {
    return this.request(`/api/dashboard/${childId}/insights`);
  }

  // ==================== Reports ====================

  async getReportSummary(
    childId: string,
    params?: { from?: string; to?: string; observations?: number }
  ): Promise<ReportSummaryData> {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.observations) query.set('observations', String(params.observations));
    const qs = query.toString();
    return this.request(`/api/children/${childId}/reports/summary${qs ? `?${qs}` : ''}`);
  }

  // ==================== Profile ====================

  async getProfile(): Promise<Profile> {
    return this.request('/api/profile');
  }

  async updateProfile(data: {
    name?: string;
    email?: string;
  }): Promise<Profile> {
    return this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    return this.request('/api/profile/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async getNotificationPrefs(): Promise<NotificationPrefs> {
    return this.request('/api/profile/notifications');
  }

  async updateNotificationPrefs(
    data: Partial<NotificationPrefs>
  ): Promise<NotificationPrefs> {
    return this.request('/api/profile/notifications', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ==================== Export ====================

  async exportData(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const token = TokenManager.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.baseUrl}/api/export?format=${format}`, {
        headers,
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Export failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return response.blob();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Export request timed out. Please try again.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ==================== Sharing ====================

  async getShares(): Promise<FamilyShare[]> {
    return this.request('/api/sharing');
  }

  async inviteShare(data: {
    email: string;
    role?: 'viewer' | 'contributor';
    childIds?: string[];
  }): Promise<FamilyShare> {
    return this.request('/api/sharing/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateShare(
    id: string,
    data: { role?: 'viewer' | 'contributor'; childIds?: string[] }
  ): Promise<FamilyShare> {
    return this.request(`/api/sharing/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async revokeShare(id: string): Promise<void> {
    return this.request(`/api/sharing/${id}`, { method: 'DELETE' });
  }

  async getSharedWithMe(): Promise<FamilyShare[]> {
    return this.request('/api/sharing/shared-with-me');
  }

  async respondToShare(
    id: string,
    action: 'accept' | 'decline'
  ): Promise<FamilyShare> {
    return this.request(`/api/sharing/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
