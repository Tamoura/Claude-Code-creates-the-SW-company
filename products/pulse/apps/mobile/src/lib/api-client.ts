import { getToken } from './secure-store';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  RiskData,
  RiskHistoryData,
  MetricsSummary,
  VelocityData,
  CoverageData,
  Repository,
} from '../types';

const API_BASE_URL = __DEV__
  ? 'http://localhost:5003'
  : 'https://api.pulse.connectsw.com';

export class ApiError extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail: string
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorBody: { title?: string; detail?: string } = {};
      try {
        errorBody = await response.json() as { title?: string; detail?: string };
      } catch {
        // Response may not be JSON
      }
      throw new ApiError(
        response.status,
        errorBody.title ?? 'Request Failed',
        errorBody.detail ?? `HTTP ${response.status}`
      );
    }

    const data = await response.json() as T;
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'Timeout', 'Request timed out');
    }
    throw new ApiError(
      0,
      'Network Error',
      'Unable to connect to server. Please check your connection.'
    );
  }
}

// Auth endpoints
export function login(payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return request<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Risk endpoints
export function getRiskCurrent(teamId: string): Promise<RiskData> {
  return request<RiskData>(
    `/api/v1/risk/current?teamId=${encodeURIComponent(teamId)}`
  );
}

export function getRiskHistory(
  teamId: string,
  days = 30
): Promise<RiskHistoryData> {
  return request<RiskHistoryData>(
    `/api/v1/risk/history?teamId=${encodeURIComponent(teamId)}&days=${days}`
  );
}

// Metrics endpoints
export function getMetricsSummary(teamId: string): Promise<MetricsSummary> {
  return request<MetricsSummary>(
    `/api/v1/metrics/summary?teamId=${encodeURIComponent(teamId)}`
  );
}

export function getVelocity(
  teamId: string,
  range = '30d'
): Promise<VelocityData> {
  return request<VelocityData>(
    `/api/v1/metrics/velocity?teamId=${encodeURIComponent(teamId)}&range=${range}`
  );
}

export function getCoverage(
  teamId: string,
  range = '30d'
): Promise<CoverageData> {
  return request<CoverageData>(
    `/api/v1/metrics/coverage?teamId=${encodeURIComponent(teamId)}&range=${range}`
  );
}

// Repos endpoint
export function getRepos(teamId: string): Promise<Repository[]> {
  return request<Repository[]>(
    `/api/v1/repos?teamId=${encodeURIComponent(teamId)}`
  );
}
