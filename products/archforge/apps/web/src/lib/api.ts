// API client for ArchForge backend
// Usage: import { api } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5012';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  frameworkPreference: string;
  artifactCount?: number;
  memberCount?: number;
  createdBy?: { id: string; email: string; fullName: string };
  archivedAt?: string | null;
  thumbnailUrl?: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface ArtifactElement {
  id: string;
  externalId: string;
  type: string;
  name: string;
  description: string | null;
  layer: string | null;
  properties: Record<string, unknown>;
}

export interface ArtifactRelationship {
  id: string;
  type: string;
  label: string | null;
  sourceId: string;
  targetId: string;
  sourceName?: string;
  targetName?: string;
}

export interface Artifact {
  id: string;
  projectId: string;
  name: string;
  type: string;
  framework: string;
  status: string;
  currentVersion: number;
  /** @deprecated use currentVersion */
  version?: number;
  elementCount?: number;
  svgContent?: string | null;
  /** @deprecated use svgContent */
  mermaidDiagram?: string | null;
  nlDescription?: string | null;
  /** @deprecated use nlDescription */
  prompt?: string | null;
  canvasData?: unknown;
  createdBy?: { id: string; email: string; fullName: string };
  createdAt: string;
  updatedAt: string;
  elements?: ArtifactElement[];
  relationships?: ArtifactRelationship[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  framework: string;
  type: string;
  category: string | null;
}

export interface ValidationResult {
  score: number;
  grade: string;
  rules: Array<{
    ruleId: string;
    passed: boolean;
    message: string;
    severity: string;
  }>;
}

export interface ExportResult {
  format: string;
  content: string;
  filename: string;
}

export interface PaginatedProjects {
  data: Project[];
  meta: {
    total: number;
    pageSize: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface PaginatedArtifacts {
  data: Artifact[];
  meta: {
    total: number;
    pageSize: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

// ─── Token store (in-memory only, not persisted to localStorage) ──────────────

let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // send httpOnly cookies
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let detail: string | undefined;
    try {
      const body = await res.json();
      // RFC 7807 problem+json or standard error shapes
      message = body.title || body.message || body.error || message;
      detail = body.detail || body.details;
    } catch {
      // ignore JSON parse failure
    }
    throw new ApiError(res.status, message, detail);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  register: (data: { email: string; password: string; fullName: string }) =>
    request<{ message: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ accessToken: string; user: User }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<void>('/api/v1/auth/logout', { method: 'POST' }),

  me: () => request<User>('/api/v1/auth/me'),
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = {
  list: (cursor?: string) =>
    request<PaginatedProjects>(
      `/api/v1/projects${cursor ? `?cursor=${cursor}` : ''}`,
    ),

  get: (id: string) => request<Project>(`/api/v1/projects/${id}`),

  create: (data: { name: string; description?: string; frameworkPreference: string }) =>
    request<Project>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<{ name: string; description: string; status: string }>) =>
    request<Project>(`/api/v1/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string, confirmName: string) =>
    request<void>(`/api/v1/projects/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirmName }),
    }),
};

// ─── Artifacts ────────────────────────────────────────────────────────────────

export const artifacts = {
  list: (projectId: string) =>
    request<PaginatedArtifacts>(`/api/v1/projects/${projectId}/artifacts`),

  get: (projectId: string, artifactId: string) =>
    request<Artifact>(`/api/v1/projects/${projectId}/artifacts/${artifactId}`),

  generate: (
    projectId: string,
    data: { prompt: string; type: string; framework: string },
  ) =>
    request<Artifact>(`/api/v1/projects/${projectId}/artifacts/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  regenerate: (projectId: string, artifactId: string) =>
    request<Artifact>(
      `/api/v1/projects/${projectId}/artifacts/${artifactId}/regenerate`,
      { method: 'POST' },
    ),

  delete: (projectId: string, artifactId: string) =>
    request<void>(`/api/v1/projects/${projectId}/artifacts/${artifactId}`, {
      method: 'DELETE',
    }),

  export: (
    projectId: string,
    artifactId: string,
    format: 'json' | 'mermaid' | 'plantuml',
  ) =>
    request<ExportResult>(
      `/api/v1/projects/${projectId}/artifacts/${artifactId}/export`,
      {
        method: 'POST',
        body: JSON.stringify({ format }),
      },
    ),

  validate: (projectId: string, artifactId: string) =>
    request<ValidationResult>(
      `/api/v1/projects/${projectId}/artifacts/${artifactId}/validate`,
      { method: 'POST' },
    ),
};

// ─── Templates ────────────────────────────────────────────────────────────────

export const templates = {
  list: () => request<{ templates: Template[] }>('/api/v1/templates'),

  instantiate: (templateId: string, projectId: string) =>
    request<Artifact>(`/api/v1/templates/${templateId}/instantiate`, {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    }),
};
