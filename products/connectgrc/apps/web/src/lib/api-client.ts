/**
 * API Client for ConnectGRC
 *
 * Base HTTP client for communicating with the Fastify backend.
 * Expanded with all domain types and methods.
 */

import { TokenManager } from './token-manager';

const API_BASE_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5006')
    : 'http://localhost:5006';

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// User with uppercase role
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'TALENT' | 'EMPLOYER' | 'ADMIN';
  emailVerified: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
}

export interface Profile {
  id: string;
  userId: string;
  headline: string | null;
  experienceLevel: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  skills: string[];
  certifications: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DomainScore {
  id: string;
  userId: string;
  domain: string;
  score: number;
  tier: string;
  assessmentCount: number;
  lastAssessmentAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  userId: string;
  domain: string;
  status: string;
  score: number | null;
  tier: string | null;
  startedAt: string;
  completedAt: string | null;
  answers?: AssessmentAnswer[];
}

export interface AssessmentAnswer {
  id: string;
  assessmentId: string;
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  answeredAt: string;
}

export interface Question {
  id: string;
  domain: string;
  difficulty: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Job {
  id: string;
  employerId: string;
  title: string;
  description: string;
  requiredDomains: string[];
  requiredTier: string;
  location: string;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  applications?: JobApplication[];
}

export interface JobApplication {
  id: string;
  jobId: string;
  userId: string;
  status: string;
  coverLetter: string | null;
  appliedAt: string;
  updatedAt: string;
  job?: Job;
}

export interface CareerSimulation {
  id: string;
  userId: string;
  targetRole: string;
  targetLevel: string;
  currentScores: Record<string, number>;
  requiredScores: Record<string, number>;
  gaps: Record<string, number>;
  recommendations: string[];
  createdAt: string;
}

export interface LearningPath {
  id: string;
  userId: string;
  domain: string;
  currentLevel: string;
  targetLevel: string;
  resources: string[];
  estimatedHours: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  type: string;
  domain: string | null;
  difficulty: string | null;
  featured: boolean;
  createdAt: string;
  bookmarked?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ApiClientError extends Error {
  status: number;
  code: string;
  detail: string;

  constructor(status: number, code: string, detail: string) {
    super(detail);
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.name = 'ApiClientError';
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const token = TokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        if (response.status === 401) {
          TokenManager.clearToken();
        }

        let errorBody: ApiError;
        try {
          errorBody = await response.json();
        } catch {
          throw new ApiClientError(
            response.status,
            'UNKNOWN_ERROR',
            `Request failed with status ${response.status}`
          );
        }

        throw new ApiClientError(
          response.status,
          errorBody.error?.code || 'UNKNOWN_ERROR',
          errorBody.error?.message || 'An unknown error occurred'
        );
      }

      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new ApiClientError(500, 'NETWORK_ERROR', 'Failed to connect to API');
    }
  }

  // Auth methods
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    TokenManager.setToken(response.accessToken);
    return response;
  }

  async register(
    name: string,
    email: string,
    password: string,
    role: 'TALENT' | 'EMPLOYER'
  ): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/v1/auth/logout', { method: 'DELETE' });
    } finally {
      TokenManager.clearToken();
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await this.request<{ accessToken: string; refreshToken: string }>(
      '/api/v1/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }
    );

    TokenManager.setToken(response.accessToken);
    return response;
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/v1/auth/verify-email/${token}`, {
      method: 'POST',
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // Profile methods
  async getProfile(): Promise<{ profile: Profile }> {
    return this.request<{ profile: Profile }>('/api/v1/profile');
  }

  async updateProfile(data: Partial<Profile>): Promise<{ profile: Profile }> {
    return this.request<{ profile: Profile }>('/api/v1/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Domain score methods
  async getDomainScores(): Promise<{ domainScores: DomainScore[] }> {
    return this.request<{ domainScores: DomainScore[] }>('/api/v1/domain-scores');
  }

  // Assessment methods
  async getAssessments(): Promise<{ assessments: Assessment[] }> {
    return this.request<{ assessments: Assessment[] }>('/api/v1/assessments');
  }

  async startAssessment(domain: string): Promise<{ assessment: Assessment }> {
    return this.request<{ assessment: Assessment }>('/api/v1/assessments', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });
  }

  async getAssessment(assessmentId: string): Promise<{ assessment: Assessment; question: Question }> {
    return this.request<{ assessment: Assessment; question: Question }>(
      `/api/v1/assessments/${assessmentId}`
    );
  }

  async submitAnswer(
    assessmentId: string,
    questionId: string,
    selectedOption: string
  ): Promise<{ isCorrect: boolean; explanation: string; nextQuestion: Question | null }> {
    return this.request<{ isCorrect: boolean; explanation: string; nextQuestion: Question | null }>(
      `/api/v1/assessments/${assessmentId}/answer`,
      {
        method: 'POST',
        body: JSON.stringify({ questionId, selectedOption }),
      }
    );
  }

  async completeAssessment(assessmentId: string): Promise<{ assessment: Assessment }> {
    return this.request<{ assessment: Assessment }>(
      `/api/v1/assessments/${assessmentId}/complete`,
      {
        method: 'POST',
      }
    );
  }

  // Job methods
  async getJobs(params?: { domain?: string; remote?: boolean; page?: number; limit?: number }): Promise<PaginatedResponse<Job>> {
    const query = new URLSearchParams();
    if (params?.domain) query.set('domain', params.domain);
    if (params?.remote !== undefined) query.set('remote', String(params.remote));
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const endpoint = `/api/v1/jobs${query.toString() ? `?${query.toString()}` : ''}`;
    return this.request<PaginatedResponse<Job>>(endpoint);
  }

  async getJob(jobId: string): Promise<{ job: Job }> {
    return this.request<{ job: Job }>(`/api/v1/jobs/${jobId}`);
  }

  async applyToJob(jobId: string, coverLetter?: string): Promise<{ application: JobApplication }> {
    return this.request<{ application: JobApplication }>(`/api/v1/jobs/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ coverLetter }),
    });
  }

  async getApplications(): Promise<{ applications: JobApplication[] }> {
    return this.request<{ applications: JobApplication[] }>('/api/v1/applications');
  }

  // Career simulation methods
  async simulateCareer(targetRole: string, targetLevel: string): Promise<{ simulation: CareerSimulation }> {
    return this.request<{ simulation: CareerSimulation }>('/api/v1/career/simulate', {
      method: 'POST',
      body: JSON.stringify({ targetRole, targetLevel }),
    });
  }

  async getSimulations(): Promise<{ simulations: CareerSimulation[] }> {
    return this.request<{ simulations: CareerSimulation[] }>('/api/v1/career/simulations');
  }

  async getLearningPaths(): Promise<{ learningPaths: LearningPath[] }> {
    return this.request<{ learningPaths: LearningPath[] }>('/api/v1/learning-paths');
  }

  // Resource methods
  async getResources(params?: { domain?: string; type?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Resource>> {
    const query = new URLSearchParams();
    if (params?.domain) query.set('domain', params.domain);
    if (params?.type) query.set('type', params.type);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const endpoint = `/api/v1/resources${query.toString() ? `?${query.toString()}` : ''}`;
    return this.request<PaginatedResponse<Resource>>(endpoint);
  }

  async getResource(resourceId: string): Promise<{ resource: Resource }> {
    return this.request<{ resource: Resource }>(`/api/v1/resources/${resourceId}`);
  }

  async bookmarkResource(resourceId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/v1/resources/${resourceId}/bookmark`, {
      method: 'POST',
    });
  }

  async unbookmarkResource(resourceId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/v1/resources/${resourceId}/bookmark`, {
      method: 'DELETE',
    });
  }

  async getBookmarks(): Promise<{ resources: Resource[] }> {
    return this.request<{ resources: Resource[] }>('/api/v1/resources/bookmarks');
  }

  // Notification methods
  async getNotifications(): Promise<{ notifications: Notification[] }> {
    return this.request<{ notifications: Notification[] }>('/api/v1/notifications');
  }

  async markNotificationRead(notificationId: string): Promise<{ notification: Notification }> {
    return this.request<{ notification: Notification }>(
      `/api/v1/notifications/${notificationId}/read`,
      {
        method: 'PATCH',
      }
    );
  }

  async markAllNotificationsRead(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/v1/notifications/read-all', {
      method: 'PATCH',
    });
  }

  async getUnreadCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>('/api/v1/notifications/unread-count');
  }

  // Generic methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
