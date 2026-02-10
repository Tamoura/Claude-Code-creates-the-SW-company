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

// ==================== Domain Types ====================

export interface Child {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | null;
  ageBand: string | null;
  photoUrl: string | null;
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
    options: RequestInit = {}
  ): Promise<T> {
    const token = TokenManager.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      credentials: 'include',
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
  }): Promise<Child> {
    return this.request('/api/children', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChild(
    id: string,
    data: { name?: string; dateOfBirth?: string; gender?: string | null }
  ): Promise<Child> {
    return this.request(`/api/children/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteChild(id: string): Promise<void> {
    return this.request(`/api/children/${id}`, { method: 'DELETE' });
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
}

export const apiClient = new ApiClient(API_BASE_URL);
