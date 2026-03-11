const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5015';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── Content ─────────────────────────────────────────

export interface ContentItem {
  id: string;
  platform: string;
  url: string;
  title: string | null;
  body: string | null;
  author: string | null;
  authorFollowers: number | null;
  likes: number;
  shares: number;
  comments: number;
  views: number;
  viralityScore: number;
  engagementRate: number;
  velocityScore: number;
  percentile: number;
  hashtags: string[];
  category: string | null;
  mediaType: string;
  publishedAt: string | null;
  scrapedAt: string;
}

export interface ContentResponse {
  content: ContentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ContentFilters {
  platform?: string;
  category?: string;
  minScore?: number;
  mediaType?: string;
  sortBy?: string;
  order?: string;
  search?: string;
  timeRange?: string;
  page?: number;
  limit?: number;
}

export function getContent(filters: ContentFilters = {}): Promise<ContentResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return apiFetch(`/api/v1/content?${params}`);
}

export function getTopContent(): Promise<{ content: ContentItem[]; count: number }> {
  return apiFetch('/api/v1/content/top');
}

export function getContentById(id: string): Promise<{ content: ContentItem }> {
  return apiFetch(`/api/v1/content/${id}`);
}

// ─── Analytics ───────────────────────────────────────

export interface OverviewStats {
  totalContent: number;
  last24hCount: number;
  top1PercentCount: number;
  platformBreakdown: { platform: string; count: number; avgViralityScore: number }[];
  topCategories: { category: string; count: number; avgViralityScore: number }[];
}

export interface TrendsData {
  trendingHashtags: { tag: string; count: number }[];
  platformVelocity: { platform: string; avgVelocity: number; maxVirality: number; contentCount: number }[];
}

export function getOverview(): Promise<OverviewStats> {
  return apiFetch('/api/v1/analytics/overview');
}

export function getTrends(): Promise<TrendsData> {
  return apiFetch('/api/v1/analytics/trends');
}

// ─── Auth ────────────────────────────────────────────

export function login(email: string, password: string): Promise<{ token: string; user: any }> {
  return apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function signup(email: string, password: string, name?: string): Promise<{ token: string; user: any }> {
  return apiFetch('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

// ─── Scraper ─────────────────────────────────────────

export function triggerScrape(token: string): Promise<{ message: string; results: any[] }> {
  return apiFetch('/api/v1/scraper/run', { method: 'POST', token });
}
