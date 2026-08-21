import { Project, Task, TaskStatus } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  });

  if (!response.ok) {
    // The API always answers with problem+json, so the title is safe to show.
    const problem = await response.json().catch(() => ({ title: response.statusText }));
    throw new Error(problem.title || 'Request failed');
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export function listTasks(status?: TaskStatus): Promise<{ tasks: Task[]; total: number }> {
  return request(`/tasks${status ? `?status=${status}` : ''}`);
}

export function createTask(input: { title: string; projectId: string }): Promise<{ task: Task }> {
  return request('/tasks', { method: 'POST', body: JSON.stringify(input) });
}

export function updateTask(id: string, input: { status: TaskStatus }): Promise<{ task: Task }> {
  return request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteTask(id: string): Promise<void> {
  return request(`/tasks/${id}`, { method: 'DELETE' });
}

export function listProjects(): Promise<{ projects: Project[] }> {
  return request('/projects');
}
