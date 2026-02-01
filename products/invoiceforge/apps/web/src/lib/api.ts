import type {
  Invoice,
  Client,
  GenerateInvoiceRequest,
  UpdateInvoiceRequest,
  CreateClientRequest,
  UpdateClientRequest,
  InvoiceSummary,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004/api';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    // Unauthorized - redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json();
}

// Invoice API
export async function generateInvoice(
  prompt: string,
  clientId?: string
): Promise<Invoice> {
  const payload: GenerateInvoiceRequest = { prompt, clientId };
  return apiFetch('/invoices/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listInvoices(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<{
  invoices: Invoice[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: InvoiceSummary;
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);

  const queryString = query.toString();
  return apiFetch(`/invoices${queryString ? `?${queryString}` : ''}`);
}

export async function getInvoice(id: string): Promise<Invoice> {
  return apiFetch(`/invoices/${id}`);
}

export async function updateInvoice(
  id: string,
  data: UpdateInvoiceRequest
): Promise<Invoice> {
  return apiFetch(`/invoices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteInvoice(id: string): Promise<void> {
  await apiFetch(`/invoices/${id}`, {
    method: 'DELETE',
  });
}

export async function sendInvoice(
  id: string
): Promise<{ status: string; shareableLink: string }> {
  return apiFetch(`/invoices/${id}/send`, {
    method: 'POST',
  });
}

// Client API
export async function listClients(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{
  clients: Client[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.search) query.set('search', params.search);

  const queryString = query.toString();
  return apiFetch(`/clients${queryString ? `?${queryString}` : ''}`);
}

export async function getClient(
  id: string
): Promise<{ client: Client; invoices: Invoice[] }> {
  return apiFetch(`/clients/${id}`);
}

export async function createClient(data: CreateClientRequest): Promise<Client> {
  return apiFetch('/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateClient(
  id: string,
  data: UpdateClientRequest
): Promise<Client> {
  return apiFetch(`/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteClient(id: string): Promise<void> {
  await apiFetch(`/clients/${id}`, {
    method: 'DELETE',
  });
}

// Public API (no auth required)
export async function getPublicInvoice(token: string): Promise<import('./types').PublicInvoice> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004/api';
  const res = await fetch(`${API_BASE}/invoices/public/${token}`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Invoice not found' }));
    throw new Error(error.message || 'Failed to load invoice');
  }

  return res.json();
}

// User Profile API
export async function getProfile(): Promise<import('./types').UserProfile> {
  return apiFetch('/users/me');
}

export async function updateProfile(data: {
  name?: string;
  businessName?: string;
}): Promise<import('./types').UserProfile> {
  return apiFetch('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getSubscription(): Promise<import('./types').Subscription> {
  return apiFetch('/users/me/subscription');
}

// Stripe Connect API
export async function getStripeConnectUrl(): Promise<{ url: string }> {
  return apiFetch('/users/me/stripe/connect');
}

export async function handleStripeCallback(code: string): Promise<{ connected: boolean }> {
  return apiFetch('/users/me/stripe/callback', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function disconnectStripe(): Promise<{ disconnected: boolean }> {
  return apiFetch('/users/me/stripe/disconnect', {
    method: 'POST',
  });
}

// PDF Download API
export async function downloadInvoicePdf(id: string): Promise<Blob> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004/api';

  const res = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to download PDF');
  }

  return res.blob();
}

// Payment Link API
export async function createPaymentLink(id: string): Promise<{
  paymentLink: string;
  stripeSessionId: string;
}> {
  return apiFetch(`/invoices/${id}/payment-link`, {
    method: 'POST',
  });
}

// Auth API
export async function login(
  email: string,
  password: string
): Promise<{ user: import('./types').UserProfile; accessToken: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Invalid email or password');
  }
  const data = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  return data;
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<{ user: import('./types').UserProfile; accessToken: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Registration failed' }));
    throw new Error(error.message || 'Registration failed');
  }
  const data = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Clear token regardless
  }
  localStorage.removeItem('accessToken');
}

// Legacy export for compatibility
export { apiFetch };
