/**
 * AIRouter API Client
 *
 * Mock mode (default for prototype) -- no backend needed.
 * All methods return realistic mock data for the 10 free-tier
 * AI providers supported by AIRouter.
 */

import { TokenManager } from './token-manager';

// ---------- Types ----------

export interface User {
  id: string;
  email: string;
}

export interface LoginResponse {
  id: string;
  email: string;
  token: string;
}

export interface Provider {
  id: string;
  name: string;
  slug: string;
  description: string;
  freeTierLimits: string;
  models: string[];
  status: 'operational' | 'degraded' | 'down';
  website: string;
  keyGuide: string;
}

export interface StoredKey {
  id: string;
  providerId: string;
  providerName: string;
  keyPrefix: string;
  status: 'valid' | 'invalid' | 'expired';
  addedAt: string;
}

export interface UsageStats {
  totalRequestsToday: number;
  activeProviders: number;
  freeCapacityEstimate: string;
  requestsThisMonth: number;
}

export interface RecentRequest {
  id: string;
  model: string;
  provider: string;
  tokens: number;
  latencyMs: number;
  status: 'success' | 'error';
  timestamp: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  id: string;
  provider: string;
  model: string;
  content: string;
  tokens: { prompt: number; completion: number; total: number };
  latencyMs: number;
}

export interface ProviderUsage {
  providerId: string;
  providerName: string;
  requestCount: number;
  tokenCount: number;
  avgLatencyMs: number;
}

// ---------- Mock Data ----------

const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'google-gemini',
    name: 'Google Gemini',
    slug: 'gemini',
    description:
      'Google\'s multimodal AI with generous free tier. Supports text, images, and code generation.',
    freeTierLimits: '15 RPM / 1M tokens/day',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    status: 'operational',
    website: 'https://ai.google.dev',
    keyGuide:
      '1. Go to ai.google.dev\n2. Click "Get API Key"\n3. Sign in with Google\n4. Create a new API key\n5. Copy the key',
  },
  {
    id: 'groq',
    name: 'Groq',
    slug: 'groq',
    description:
      'Ultra-fast inference on LPU hardware. Free tier with high throughput for open-source models.',
    freeTierLimits: '30 RPM / 14,400 req/day',
    models: ['llama-3.3-70b', 'mixtral-8x7b', 'gemma2-9b'],
    status: 'operational',
    website: 'https://console.groq.com',
    keyGuide:
      '1. Go to console.groq.com\n2. Sign up / Log in\n3. Navigate to API Keys\n4. Click "Create API Key"\n5. Copy the key',
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    slug: 'cerebras',
    description:
      'Wafer-scale engine delivering extremely fast inference. Free developer tier available.',
    freeTierLimits: '30 RPM / 1M tokens/day',
    models: ['llama-3.3-70b', 'llama-3.1-8b'],
    status: 'operational',
    website: 'https://cloud.cerebras.ai',
    keyGuide:
      '1. Go to cloud.cerebras.ai\n2. Create an account\n3. Go to API Keys section\n4. Generate a new key\n5. Copy the key',
  },
  {
    id: 'sambanova',
    name: 'SambaNova',
    slug: 'sambanova',
    description:
      'Custom AI chip provider with free community cloud tier for open-source models.',
    freeTierLimits: '10 RPM / unlimited tokens',
    models: ['llama-3.1-405b', 'llama-3.1-70b', 'llama-3.1-8b'],
    status: 'operational',
    website: 'https://cloud.sambanova.ai',
    keyGuide:
      '1. Go to cloud.sambanova.ai\n2. Sign up for free\n3. Navigate to API section\n4. Create an API key\n5. Copy the key',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    slug: 'openrouter',
    description:
      'Meta-router aggregating 100+ models. Some models have free tiers with rate limits.',
    freeTierLimits: '20 RPM / varies by model',
    models: ['auto', 'mistral-7b-free', 'llama-3-8b-free'],
    status: 'operational',
    website: 'https://openrouter.ai',
    keyGuide:
      '1. Go to openrouter.ai\n2. Sign in with Google or GitHub\n3. Go to Keys page\n4. Create a new key\n5. Copy the key',
  },
  {
    id: 'cohere',
    name: 'Cohere',
    slug: 'cohere',
    description:
      'Enterprise NLP platform with free trial tier. Strong at RAG and text generation.',
    freeTierLimits: '20 RPM / 1000 req/month',
    models: ['command-r-plus', 'command-r', 'command-light'],
    status: 'operational',
    website: 'https://dashboard.cohere.com',
    keyGuide:
      '1. Go to dashboard.cohere.com\n2. Sign up for free\n3. Navigate to API Keys\n4. Generate a trial key\n5. Copy the key',
  },
  {
    id: 'huggingface',
    name: 'HuggingFace',
    slug: 'huggingface',
    description:
      'Open-source AI hub with free Inference API. Access thousands of community models.',
    freeTierLimits: '30 RPM / rate limited',
    models: ['meta-llama/Llama-3-8b', 'mistralai/Mistral-7B', 'various'],
    status: 'operational',
    website: 'https://huggingface.co',
    keyGuide:
      '1. Go to huggingface.co\n2. Create an account\n3. Go to Settings > Access Tokens\n4. Create a new token (read access)\n5. Copy the token',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    slug: 'mistral',
    description:
      'French AI lab building efficient open models. Free tier for experimentation.',
    freeTierLimits: '5 RPM / 2B tokens/month',
    models: ['mistral-large', 'mistral-small', 'open-mistral-nemo'],
    status: 'operational',
    website: 'https://console.mistral.ai',
    keyGuide:
      '1. Go to console.mistral.ai\n2. Sign up for free\n3. Navigate to API Keys\n4. Create a new key\n5. Copy the key',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    slug: 'cloudflare',
    description:
      'Edge AI inference with generous free tier. Run models close to users worldwide.',
    freeTierLimits: '10,000 neurons/day free',
    models: ['llama-3.1-8b', 'mistral-7b', 'phi-2'],
    status: 'degraded',
    website: 'https://dash.cloudflare.com',
    keyGuide:
      '1. Go to dash.cloudflare.com\n2. Navigate to AI > Workers AI\n3. Create an API token\n4. Set Workers AI read permissions\n5. Copy the token',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    slug: 'deepseek',
    description:
      'Chinese AI lab with strong coding and reasoning models. Competitive free tier.',
    freeTierLimits: '60 RPM / 10M tokens/day',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
    status: 'operational',
    website: 'https://platform.deepseek.com',
    keyGuide:
      '1. Go to platform.deepseek.com\n2. Sign up for free\n3. Go to API Keys\n4. Create a new key\n5. Copy the key',
  },
];

const MOCK_STORED_KEYS: StoredKey[] = [
  {
    id: 'key-1',
    providerId: 'google-gemini',
    providerName: 'Google Gemini',
    keyPrefix: 'AIza...9xKm',
    status: 'valid',
    addedAt: '2026-01-28T10:30:00Z',
  },
  {
    id: 'key-2',
    providerId: 'groq',
    providerName: 'Groq',
    keyPrefix: 'gsk_...vR4j',
    status: 'valid',
    addedAt: '2026-01-29T14:15:00Z',
  },
  {
    id: 'key-3',
    providerId: 'deepseek',
    providerName: 'DeepSeek',
    keyPrefix: 'sk-...mN8p',
    status: 'valid',
    addedAt: '2026-02-01T09:00:00Z',
  },
];

const MOCK_RECENT_REQUESTS: RecentRequest[] = [
  {
    id: 'req-1',
    model: 'gemini-2.0-flash',
    provider: 'Google Gemini',
    tokens: 342,
    latencyMs: 890,
    status: 'success',
    timestamp: '2026-02-04T08:45:00Z',
  },
  {
    id: 'req-2',
    model: 'llama-3.3-70b',
    provider: 'Groq',
    tokens: 1205,
    latencyMs: 240,
    status: 'success',
    timestamp: '2026-02-04T08:42:00Z',
  },
  {
    id: 'req-3',
    model: 'deepseek-chat',
    provider: 'DeepSeek',
    tokens: 876,
    latencyMs: 1340,
    status: 'success',
    timestamp: '2026-02-04T08:38:00Z',
  },
  {
    id: 'req-4',
    model: 'mistral-large',
    provider: 'Mistral',
    tokens: 0,
    latencyMs: 5200,
    status: 'error',
    timestamp: '2026-02-04T08:35:00Z',
  },
  {
    id: 'req-5',
    model: 'llama-3.1-8b',
    provider: 'Cerebras',
    tokens: 512,
    latencyMs: 180,
    status: 'success',
    timestamp: '2026-02-04T08:30:00Z',
  },
  {
    id: 'req-6',
    model: 'gemini-1.5-pro',
    provider: 'Google Gemini',
    tokens: 2048,
    latencyMs: 2100,
    status: 'success',
    timestamp: '2026-02-04T08:25:00Z',
  },
  {
    id: 'req-7',
    model: 'command-r',
    provider: 'Cohere',
    tokens: 654,
    latencyMs: 1100,
    status: 'success',
    timestamp: '2026-02-04T08:20:00Z',
  },
  {
    id: 'req-8',
    model: 'auto',
    provider: 'Groq',
    tokens: 398,
    latencyMs: 195,
    status: 'success',
    timestamp: '2026-02-04T08:15:00Z',
  },
];

const MOCK_PROVIDER_USAGE: ProviderUsage[] = [
  {
    providerId: 'google-gemini',
    providerName: 'Google Gemini',
    requestCount: 284,
    tokenCount: 142000,
    avgLatencyMs: 950,
  },
  {
    providerId: 'groq',
    providerName: 'Groq',
    requestCount: 412,
    tokenCount: 206000,
    avgLatencyMs: 220,
  },
  {
    providerId: 'deepseek',
    providerName: 'DeepSeek',
    requestCount: 156,
    tokenCount: 98000,
    avgLatencyMs: 1280,
  },
];

// ---------- Helpers ----------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let mockKeys = [...MOCK_STORED_KEYS];

// ---------- API Client ----------

export const apiClient = {
  // --- Auth ---

  async login(email: string, password: string): Promise<LoginResponse> {
    await delay(400);
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    if (password.length < 6) {
      throw new Error('Invalid credentials');
    }
    const token = `mock-jwt-${Date.now()}`;
    TokenManager.setToken(token);
    return { id: 'user-1', email, token };
  },

  async signup(
    email: string,
    password: string,
    confirmPassword: string
  ): Promise<LoginResponse> {
    await delay(500);
    if (!email || !password || !confirmPassword) {
      throw new Error('All fields are required');
    }
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    const token = `mock-jwt-${Date.now()}`;
    TokenManager.setToken(token);
    return { id: 'user-1', email, token };
  },

  async logout(): Promise<void> {
    await delay(200);
    TokenManager.clearToken();
  },

  // --- Providers ---

  async listProviders(): Promise<Provider[]> {
    await delay(300);
    return [...MOCK_PROVIDERS];
  },

  async getProvider(id: string): Promise<Provider | undefined> {
    await delay(200);
    return MOCK_PROVIDERS.find((p) => p.id === id);
  },

  async getProviderGuide(id: string): Promise<string> {
    await delay(200);
    const provider = MOCK_PROVIDERS.find((p) => p.id === id);
    return provider?.keyGuide ?? 'Guide not found for this provider.';
  },

  // --- Key Vault ---

  async listKeys(): Promise<StoredKey[]> {
    await delay(300);
    return [...mockKeys];
  },

  async addKey(
    providerId: string,
    _apiKey: string
  ): Promise<StoredKey> {
    await delay(500);
    const provider = MOCK_PROVIDERS.find((p) => p.id === providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }
    const newKey: StoredKey = {
      id: `key-${Date.now()}`,
      providerId,
      providerName: provider.name,
      keyPrefix: `sk-...${Math.random().toString(36).slice(2, 6)}`,
      status: 'valid',
      addedAt: new Date().toISOString(),
    };
    mockKeys.push(newKey);
    return newKey;
  },

  async deleteKey(keyId: string): Promise<void> {
    await delay(300);
    const index = mockKeys.findIndex((k) => k.id === keyId);
    if (index === -1) {
      throw new Error('Key not found');
    }
    mockKeys = mockKeys.filter((k) => k.id !== keyId);
  },

  async testKey(keyId: string): Promise<{ valid: boolean; message: string }> {
    await delay(800);
    const key = mockKeys.find((k) => k.id === keyId);
    if (!key) {
      throw new Error('Key not found');
    }
    return { valid: true, message: 'Key is valid and operational' };
  },

  // --- Router ---

  async chatCompletions(
    model: string,
    messages: ChatMessage[]
  ): Promise<ChatResponse> {
    await delay(1200);
    const lastMessage = messages[messages.length - 1];
    const selectedProvider =
      model === 'auto'
        ? MOCK_PROVIDERS[Math.floor(Math.random() * 3)]
        : MOCK_PROVIDERS.find((p) =>
            p.models.some((m) => m === model)
          ) ?? MOCK_PROVIDERS[0];

    const selectedModel =
      model === 'auto' ? selectedProvider.models[0] : model;

    return {
      id: `chatcmpl-${Date.now()}`,
      provider: selectedProvider.name,
      model: selectedModel,
      content: `This is a mock response from ${selectedProvider.name} (${selectedModel}). You asked: "${lastMessage?.content?.slice(0, 80) ?? ''}".\n\nIn production, this would be routed through AIRouter to the optimal free-tier provider based on availability, latency, and your key configuration.`,
      tokens: {
        prompt: Math.floor(Math.random() * 200) + 50,
        completion: Math.floor(Math.random() * 400) + 100,
        total: Math.floor(Math.random() * 600) + 150,
      },
      latencyMs: Math.floor(Math.random() * 2000) + 200,
    };
  },

  // --- Usage ---

  async getUsage(): Promise<UsageStats> {
    await delay(300);
    return {
      totalRequestsToday: 847,
      activeProviders: mockKeys.filter((k) => k.status === 'valid').length,
      freeCapacityEstimate: '~73%',
      requestsThisMonth: 12453,
    };
  },

  async getRecentRequests(): Promise<RecentRequest[]> {
    await delay(300);
    return [...MOCK_RECENT_REQUESTS];
  },

  async getProviderUsage(): Promise<ProviderUsage[]> {
    await delay(300);
    return [...MOCK_PROVIDER_USAGE];
  },
};
