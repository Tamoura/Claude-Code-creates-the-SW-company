const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new APIError(response.status, error.message || error.error, error.details);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`);
    return handleResponse(response);
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async patch<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async delete(endpoint: string): Promise<void> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};
