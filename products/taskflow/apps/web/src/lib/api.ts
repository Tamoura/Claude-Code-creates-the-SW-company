export class ApiError extends Error {
  public status: number;
  public data: Record<string, unknown> | null;

  constructor(message: string, status: number, data: Record<string, unknown> | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      (typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_API_URL
        : undefined) || 'http://localhost:5007';
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('taskflow_token');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);

    let data: T | Record<string, unknown> | null = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      const errorData = data as Record<string, unknown> | null;
      const message =
        (errorData && typeof errorData.message === 'string'
          ? errorData.message
          : null) ||
        (errorData && typeof errorData.error === 'string'
          ? errorData.error
          : null) ||
        `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, errorData);
    }

    return data as T;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

export const apiClient = new ApiClient();
