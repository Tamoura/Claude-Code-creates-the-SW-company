// StudyFlow typed API client.
//
// Auth is session-cookie based (`sf_session`, httpOnly). There is NO token in JS,
// so EVERY request uses `credentials: 'include'` to send/receive the cookie.
// Errors follow RFC 7807 (problem+json) — parsed into a typed `ApiError`.

import type {
  Dashboard,
  Goal,
  GoalDetail,
  ListEnvelope,
  PrerequisiteWarning,
  ProgressEntry,
  Reminder,
  Selection,
  Student,
  Subject,
} from './types';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5017';

/** RFC 7807 problem+json body shape. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string>;
}

/** Typed error thrown by every client call on a non-2xx response. */
export class ApiError extends Error {
  status: number;
  detail?: string;
  fieldErrors?: Record<string, string>;
  problem?: ProblemDetail;

  constructor(status: number, problem?: ProblemDetail, fallback?: string) {
    const message =
      problem?.detail ||
      problem?.title ||
      fallback ||
      `Request failed (${status})`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = problem?.detail;
    this.fieldErrors = problem?.errors;
    this.problem = problem;
  }

  /** True when the user is not authenticated. */
  get isUnauthorized() {
    return this.status === 401;
  }

  /** True when the request conflicted (e.g. duplicate selection, delete blocked). */
  get isConflict() {
    return this.status === 409;
  }
}

type QueryValue = string | number | boolean | undefined | null;
type QueryParams = Record<string, QueryValue>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: QueryParams;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(
    path.startsWith('http') ? path : `${API_URL}${path}`
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, query, signal } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      // CRITICAL: send/receive the httpOnly session cookie on every request.
      credentials: 'include',
      headers: body
        ? { 'Content-Type': 'application/json', Accept: 'application/json' }
        : { Accept: 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    // Network-level failure (API down, CORS, etc.).
    throw new ApiError(
      0,
      undefined,
      'Could not reach the StudyFlow server. Is the API running?'
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('json');

  if (!response.ok) {
    let problem: ProblemDetail | undefined;
    if (isJson) {
      try {
        problem = (await response.json()) as ProblemDetail;
      } catch {
        problem = undefined;
      }
    }
    throw new ApiError(response.status, problem);
  }

  if (!isJson) {
    return (await response.text()) as unknown as T;
  }
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Auth — US-01
// ---------------------------------------------------------------------------

export const auth = {
  signup: (email: string, password: string) =>
    request<{ student: Student }>('/v1/auth/signup', {
      method: 'POST',
      body: { email, password },
    }),

  login: (email: string, password: string) =>
    request<{ student: Student }>('/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  logout: () => request<void>('/v1/auth/logout', { method: 'POST' }),

  me: (signal?: AbortSignal) =>
    request<{ student: Student }>('/v1/auth/me', { signal }),
};

// ---------------------------------------------------------------------------
// Catalog & subjects — US-02, US-03, US-05, US-11
// ---------------------------------------------------------------------------

export interface SubjectQuery {
  q?: string;
  credits?: number;
  term?: string;
  page?: number;
  limit?: number;
}

export interface ManualSubjectInput {
  name: string;
  code?: string;
  credits?: number;
  workload?: string;
  prerequisites?: string;
  description?: string;
  term?: string;
}

export const subjects = {
  list: (query: SubjectQuery = {}) =>
    request<ListEnvelope<Subject>>('/v1/subjects', {
      query: {
        q: query.q,
        credits: query.credits,
        term: query.term,
        page: query.page,
        limit: query.limit,
      },
    }),

  get: (id: string) => request<Subject>(`/v1/subjects/${id}`),

  compare: (ids: string[]) =>
    request<{ subjects: Subject[] }>('/v1/subjects/compare', {
      query: { ids: ids.join(',') },
    }),

  create: (input: ManualSubjectInput) =>
    request<{ subject: Subject; selection: Selection }>('/v1/subjects', {
      method: 'POST',
      body: input,
    }),

  update: (id: string, input: Partial<ManualSubjectInput>) =>
    request<Subject>(`/v1/subjects/${id}`, { method: 'PATCH', body: input }),

  remove: (id: string) =>
    request<void>(`/v1/subjects/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Selections — US-04, US-13
// ---------------------------------------------------------------------------

export const selections = {
  list: () => request<ListEnvelope<Selection>>('/v1/selections'),

  add: (subjectId: string, prereqWarningAck?: boolean) =>
    request<{
      selection: Selection;
      prerequisiteWarning?: PrerequisiteWarning;
    }>('/v1/selections', {
      method: 'POST',
      body: { subjectId, prereqWarningAck },
    }),

  remove: (id: string) =>
    request<void>(`/v1/selections/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Goals — US-06, US-08, US-11
// ---------------------------------------------------------------------------

export interface GoalInput {
  selectionId: string;
  title: string;
  metricType: 'numeric' | 'boolean' | 'percentage';
  target: number;
  cadence?: 'daily' | 'weekly';
  dueDate: string; // YYYY-MM-DD
}

export const goals = {
  list: (query: { selectionId?: string; status?: string } = {}) =>
    request<ListEnvelope<Goal>>('/v1/goals', {
      query: { selectionId: query.selectionId, status: query.status },
    }),

  get: (id: string) => request<GoalDetail>(`/v1/goals/${id}`),

  create: (input: GoalInput) =>
    request<Goal>('/v1/goals', { method: 'POST', body: input }),

  update: (id: string, input: Partial<Omit<GoalInput, 'selectionId'>>) =>
    request<Goal>(`/v1/goals/${id}`, { method: 'PATCH', body: input }),

  abandon: (id: string) =>
    request<Goal>(`/v1/goals/${id}/abandon`, { method: 'POST' }),

  remove: (id: string) =>
    request<void>(`/v1/goals/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Progress — US-07
// ---------------------------------------------------------------------------

export interface ProgressInput {
  value: number;
  entryDate?: string; // YYYY-MM-DD, defaults to today server-side
  note?: string;
}

export const progress = {
  list: (goalId: string) =>
    request<ListEnvelope<ProgressEntry>>(`/v1/goals/${goalId}/progress`),

  add: (goalId: string, input: ProgressInput) =>
    request<{
      progressEntry: ProgressEntry;
      goal: { completionPct: number; streak: number; status: string };
    }>(`/v1/goals/${goalId}/progress`, { method: 'POST', body: input }),

  update: (id: string, input: Partial<ProgressInput>) =>
    request<ProgressEntry>(`/v1/progress/${id}`, {
      method: 'PATCH',
      body: input,
    }),

  remove: (id: string) =>
    request<void>(`/v1/progress/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Dashboard, reminders, export — US-10, US-09, US-12
// ---------------------------------------------------------------------------

export const dashboard = {
  get: () => request<Dashboard>('/v1/dashboard'),
};

export const reminders = {
  list: () => request<ListEnvelope<Reminder>>('/v1/reminders'),
};

/** Build the export URL — opened directly so the browser downloads the file. */
export function exportUrl(): string {
  return `${API_URL}/v1/export`;
}

export const api = {
  auth,
  subjects,
  selections,
  goals,
  progress,
  dashboard,
  reminders,
  exportUrl,
};

export default api;
