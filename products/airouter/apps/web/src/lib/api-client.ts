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

export interface GuideStep {
  step: number;
  instruction: string;
  note?: string;
}

export interface KeyAcquisitionGuide {
  steps: GuideStep[];
  tips: string[];
  gotchas: string[];
  verificationSteps: string[];
}

export interface ProviderFreeTier {
  requestsPerDay?: number;
  requestsPerMinute?: number;
  requestsPerSecond?: number;
  requestsPerMonth?: number;
  tokensPerDay?: number;
  tokensPerMonth?: number;
  neuronsPerDay?: number;
  unlimited?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  lastVerified: string;
  freeTierLimits: string;
  freeTier: ProviderFreeTier;
  models: string[];
  status: 'operational' | 'degraded' | 'down';
  website: string;
  keyGuide: string;
  keyAcquisitionGuide: KeyAcquisitionGuide;
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
    slug: 'google-gemini',
    description:
      'Google\'s multimodal AI with generous free tier. Supports text, images, and code generation.',
    category: 'Multimodal',
    lastVerified: '2026-02-01',
    freeTierLimits: '15 RPM / 1,000 req/day',
    freeTier: { requestsPerDay: 1000, requestsPerMinute: 15 },
    models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    status: 'operational',
    website: 'https://ai.google.dev',
    keyGuide:
      '1. Go to ai.google.dev\n2. Click "Get API Key"\n3. Sign in with Google\n4. Create a new API key\n5. Copy the key',
    keyAcquisitionGuide: {
      steps: [
        { step: 1, instruction: 'Go to Google AI Studio at aistudio.google.com' },
        { step: 2, instruction: 'Sign in with your Google account' },
        { step: 3, instruction: 'Click "Get API Key" in the top navigation' },
        { step: 4, instruction: 'Select "Create API key in new project" or choose an existing project' },
        { step: 5, instruction: 'Copy the generated API key', note: 'Key starts with "AIza"' },
        { step: 6, instruction: 'Store the key securely' },
        { step: 7, instruction: 'Optionally restrict the key in Google Cloud Console' },
      ],
      tips: [
        'Use a dedicated Google Cloud project to keep keys organized',
        'Gemini 2.5 Flash is best for fast, cost-effective tasks',
        'The free tier resets daily at midnight Pacific Time',
      ],
      gotchas: [
        'Free tier is per-project, not per-key',
        'Image inputs count toward your token quota',
        'Gemini Pro has stricter rate limits than Flash',
      ],
      verificationSteps: [
        'curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"',
      ],
    },
  },
  {
    id: 'groq',
    name: 'Groq',
    slug: 'groq',
    description:
      'Ultra-fast inference on LPU hardware. Free tier with high throughput for open-source models.',
    category: 'Speed',
    lastVerified: '2026-02-01',
    freeTierLimits: '30 RPM / 1,000 req/day',
    freeTier: { requestsPerDay: 1000, requestsPerMinute: 30 },
    models: ['llama-3.3-70b', 'llama-3.1-8b'],
    status: 'operational',
    website: 'https://console.groq.com',
    keyGuide:
      '1. Go to console.groq.com\n2. Sign up / Log in\n3. Navigate to API Keys\n4. Click "Create API Key"\n5. Copy the key',
    keyAcquisitionGuide: {
      steps: [
        { step: 1, instruction: 'Go to console.groq.com' },
        { step: 2, instruction: 'Sign up with email or Google/GitHub OAuth' },
        { step: 3, instruction: 'Verify your email address' },
        { step: 4, instruction: 'Navigate to "API Keys" in the left sidebar' },
        { step: 5, instruction: 'Click "Create API Key"' },
        { step: 6, instruction: 'Name the key (e.g., "airouter-dev")' },
        { step: 7, instruction: 'Copy the key immediately', note: 'Key starts with "gsk_"' },
      ],
      tips: [
        'Groq is OpenAI-compatible — use any OpenAI SDK',
        'Llama 3.3 70B has the best quality-to-speed ratio',
        'Token limits vary by model',
      ],
      gotchas: [
        'API key is shown only once — copy it immediately',
        'Rate limits are per-minute and per-day, not per-month',
        'Context windows may differ from advertised on free tier',
      ],
      verificationSteps: [
        'curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer YOUR_API_KEY"',
      ],
    },
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    slug: 'cerebras',
    description:
      'Wafer-scale engine delivering extremely fast inference. Free developer tier available.',
    category: 'Speed',
    lastVerified: '2026-02-01',
    freeTierLimits: '30 RPM / 1M tokens/day',
    freeTier: { tokensPerDay: 1000000, requestsPerMinute: 30 },
    models: ['llama-3.3-70b', 'llama-3.1-8b'],
    status: 'operational',
    website: 'https://cloud.cerebras.ai',
    keyGuide:
      '1. Go to cloud.cerebras.ai\n2. Create an account\n3. Go to API Keys section\n4. Generate a new key\n5. Copy the key',
    keyAcquisitionGuide: {
      steps: [
        { step: 1, instruction: 'Go to cloud.cerebras.ai' },
        { step: 2, instruction: 'Click "Sign Up" and create an account' },
        { step: 3, instruction: 'Verify your email address' },
        { step: 4, instruction: 'Navigate to the API Keys section' },
        { step: 5, instruction: 'Click "Generate API Key"' },
        { step: 6, instruction: 'Copy and store the key securely', note: 'Key is shown only once' },
      ],
      tips: [
        'OpenAI-compatible — just change the base URL',
        'Best for latency-sensitive applications',
        '1M tokens/day is generous for development',
      ],
      gotchas: [
        'Context window is limited to 8192 tokens on free tier',
        'Daily token limit, not monthly',
        'Not all Llama variants are available',
      ],
      verificationSteps: [
        'curl -s https://api.cerebras.ai/v1/models -H "Authorization: Bearer YOUR_API_KEY"',
      ],
    },
  },
  {
    id: 'sambanova',
    name: 'SambaNova',
    slug: 'sambanova',
    description:
      'Custom AI chip provider with unlimited free community cloud for open-source models.',
    category: 'Open Source',
    lastVerified: '2026-02-01',
    freeTierLimits: '30 RPM / unlimited tokens',
    freeTier: { unlimited: true, requestsPerMinute: 30 },
    models: ['llama-3.1-405b', 'llama-3.1-70b', 'llama-3.1-8b'],
    status: 'operational',
    website: 'https://cloud.sambanova.ai',
    keyGuide:
      '1. Go to cloud.sambanova.ai\n2. Sign up for free\n3. Navigate to API section\n4. Create an API key\n5. Copy the key',
    keyAcquisitionGuide: {
      steps: [
        { step: 1, instruction: 'Go to cloud.sambanova.ai' },
        { step: 2, instruction: 'Click "Sign Up" for the free community tier' },
        { step: 3, instruction: 'Fill in your details and verify your email' },
        { step: 4, instruction: 'Navigate to the API section' },
        { step: 5, instruction: 'Click "Create API Key"' },
        { step: 6, instruction: 'Copy the generated key', note: 'Won\'t be shown again' },
      ],
      tips: [
        'No token limits — only rate limits',
        'Great for batch processing and experimentation',
        'OpenAI-compatible API',
      ],
      gotchas: [
        'Rate limit of 30 RPM applies despite unlimited tokens',
        'Model availability can change',
        'Response times vary during peak hours',
      ],
      verificationSteps: [
        'curl -s https://api.sambanova.ai/v1/models -H "Authorization: Bearer YOUR_API_KEY"',
      ],
    },
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    slug: 'openrouter',
    description:
      'Meta-router aggregating 100+ models. Some models have free tiers with rate limits.',
    category: 'Aggregator',
    lastVerified: '2026-02-01',
    freeTierLimits: '20 RPM / 50 req/day',
    freeTier: { requestsPerDay: 50, requestsPerMinute: 20 },
    models: ['auto', 'llama-3.1-8b-free', 'gemma-2-9b-free'],
    status: 'operational',
    website: 'https://openrouter.ai',
    keyGuide:
      '1. Go to openrouter.ai\n2. Sign in with Google or GitHub\n3. Go to Keys page\n4. Create a new key\n5. Copy the key',
    keyAcquisitionGuide: {
      steps: [
        { step: 1, instruction: 'Go to openrouter.ai' },
        { step: 2, instruction: 'Click "Sign In" with Google or GitHub' },
        { step: 3, instruction: 'Navigate to the "Keys" page' },
        { step: 4, instruction: 'Click "Create Key"' },
        { step: 5, instruction: 'Name your key and set optional credit limits' },
        { step: 6, instruction: 'Copy the key', note: 'Key starts with "sk-or-"' },
        { step: 7, instruction: 'Use models with ":free" suffix for zero-cost usage' },
      ],
      tips: [
        'Filter by ":free" suffix for zero-cost models',
        'OpenAI SDK compatible',
        'Set spending limits per key for safety',
      ],
      gotchas: [
        'Not all models are free — check for ":free" suffix',
        'Free model availability changes frequently',
        'Lower rate limits on free models',
      ],
      verificationSteps: [
        'curl -s https://openrouter.ai/api/v1/models -H "Authorization: Bearer YOUR_API_KEY"',
      ],
    },
  },
  {
    id: 'cohere',
    name: 'Cohere',
    slug: 'cohere',
    description:
      'Enterprise NLP platform with free trial tier. Strong at RAG and text generation.',
    category: 'Enterprise',
    lastVerified: '2026-02-01',
    freeTierLimits: '20 RPM / 1,000 req/month',
    freeTier: { requestsPerMonth: 1000, requestsPerMinute: 20 },
    models: ['command-r-plus', 'command-r'],
    status: 'operational',
    website: 'https://dashboard.cohere.com',
    keyGuide:
      '1. Go to dashboard.cohere.com\n2. Sign up for free\n3. Navigate to API Keys\n4. Generate a trial key\n5. Copy the key',
    keyAcquisitionGuide: {
      steps: [
        { step: 1, instruction: 'Go to dashboard.cohere.com' },
        { step: 2, instruction: 'Click "Sign Up" and create an account' },
        { step: 3, instruction: 'Verify your email address' },
        { step: 4, instruction: 'Navigate to "API Keys" in the sidebar' },
        { step: 5, instruction: 'Click "Generate Trial Key"' },
        { step: 6, instruction: 'Copy the key immediately', note: 'Trial keys have "trial" in the name' },
      ],
      tips: [
        'Cohere excels at RAG use cases',
        'Command R+ supports tool use and structured outputs',
        'Trial key is sufficient for prototyping',
      ],
      gotchas: [
        'Monthly limit (1,000 requests), not daily',
        'Uses its own API format, not OpenAI-compatible',
        'Some enterprise features require paid plan',
      ],
      verificationSteps: [
        'curl -s https://api.cohere.ai/v2/models -H "Authorization: Bearer YOUR_API_KEY"',
      ],
    },
  },
  {
    id: 'huggingface',
    name: 'HuggingFace',
    slug: 'huggingface',
    description:
      'Open-source AI hub with free Inference API. Access thousands of community models.',
    category: 'Open Source',
    lastVerified: '2026-02-01',
    freeTierLimits: '30 RPM / 1,000 req/day',
    freeTier: { requestsPerDay: 1000, requestsPerMinute: 30 },
    models: ['meta-llama/Llama-3-8b', 'mistralai/Mistral-7B'],
    status: 'operational',
    website: 'https://huggingface.co',
    keyGuide:
      '1. Go to huggingface.co\n2. Create an account\n3. Go to Settings > Access Tokens\n4. Create a new token (read access)\n5. Copy the token',
    keyAcquisitionGuide: {
      steps: [
        { step: 1, instruction: 'Go to huggingface.co' },
        { step: 2, instruction: 'Click "Sign Up" (email or GitHub)' },
        { step: 3, instruction: 'Verify your email address' },
        { step: 4, instruction: 'Go to Settings > Access Tokens' },
        { step: 5, instruction: 'Click "New Token"' },
        { step: 6, instruction: 'Select "Read" permission', note: 'Read is sufficient for inference' },
        { step: 7, instruction: 'Name your token and click "Generate"' },
        { step: 8, instruction: 'Copy the token', note: 'Token starts with "hf_"' },
      ],
      tips: [
        'Use "Read" permission — "Write" is only for uploads',
        'Start with popular models',
        'Inference API loads models on demand',
      ],
      gotchas: [
        'Not all models are available via free Inference API',
        'Large models may have cold-start delays',
        'API format varies by model type',
      ],
      verificationSteps: [
        'curl -s https://api-inference.huggingface.co/models/gpt2 -H "Authorization: Bearer YOUR_TOKEN"',
      ],
    },
  },
  {
    id: 'mistral',
    name: 'Mistral',
    slug: 'mistral',
    description:
      'French AI lab building efficient open models. Free tier for experimentation.',
    category: 'Open Source',
    lastVerified: '2026-02-01',
    freeTierLimits: '1 RPS / 60 RPM',
    freeTier: { requestsPerSecond: 1, requestsPerMinute: 60 },
    models: ['mistral-small'],
    status: 'operational',
    website: 'https://console.mistral.ai',
    keyGuide:
      '1. Go to console.mistral.ai\n2. Sign up for free\n3. Navigate to API Keys\n4. Create a new key\n5. Copy the key',
    keyAcquisitionGuide: {
      steps: [
        { step: 1, instruction: 'Go to console.mistral.ai' },
        { step: 2, instruction: 'Click "Sign Up" and create an account' },
        { step: 3, instruction: 'Verify your email address' },
        { step: 4, instruction: 'Navigate to "API Keys" in the sidebar' },
        { step: 5, instruction: 'Click "Create New Key"' },
        { step: 6, instruction: 'Name your key and click "Create"' },
        { step: 7, instruction: 'Copy the key immediately', note: 'Key is shown only once' },
      ],
      tips: [
        'Mistral Small is the most cost-effective model',
        'OpenAI-compatible API format',
        'Good for European data residency',
      ],
      gotchas: [
        'Rate-limited to 1 request per second on free tier',
        'Some models require a paid plan',
        'May require payment method for verification',
      ],
      verificationSteps: [
        'curl -s https://api.mistral.ai/v1/models -H "Authorization: Bearer YOUR_API_KEY"',
      ],
    },
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    slug: 'cloudflare',
    description:
      'Edge AI inference with generous free tier. Run models close to users worldwide.',
    category: 'Edge AI',
    lastVerified: '2026-02-01',
    freeTierLimits: '60 RPM / 10,000 neurons/day',
    freeTier: { neuronsPerDay: 10000, requestsPerMinute: 60 },
    models: ['llama-3.1-8b', 'mistral-7b'],
    status: 'operational',
    website: 'https://dash.cloudflare.com',
    keyGuide:
      '1. Go to dash.cloudflare.com\n2. Navigate to AI > Workers AI\n3. Create an API token\n4. Set Workers AI read permissions\n5. Copy the token',
    keyAcquisitionGuide: {
      steps: [
        { step: 1, instruction: 'Go to dash.cloudflare.com and sign up' },
        { step: 2, instruction: 'Navigate to "My Profile" > "API Tokens"' },
        { step: 3, instruction: 'Click "Create Token"' },
        { step: 4, instruction: 'Select "Workers AI" template' },
        { step: 5, instruction: 'Set permissions: Account > Workers AI > Read' },
        { step: 6, instruction: 'Click "Continue to summary" then "Create Token"' },
        { step: 7, instruction: 'Copy the token', note: 'You also need your Account ID' },
      ],
      tips: [
        'You need Account ID in addition to the API token',
        'Neurons: simple requests use ~100-500 neurons',
        'Edge deployment = low latency worldwide',
      ],
      gotchas: [
        'Need both API token AND Account ID',
        'Context window limited to 4096 tokens',
        '"Neurons" pricing can be confusing',
      ],
      verificationSteps: [
        'curl -s "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/models/search" -H "Authorization: Bearer YOUR_TOKEN"',
      ],
    },
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    slug: 'deepseek',
    description:
      'AI lab with strong coding and reasoning models. Competitive free tier.',
    category: 'Reasoning',
    lastVerified: '2026-02-01',
    freeTierLimits: '60 RPM / 5M tokens/month',
    freeTier: { tokensPerMonth: 5000000, requestsPerMinute: 60 },
    models: ['deepseek-chat', 'deepseek-reasoner'],
    status: 'operational',
    website: 'https://platform.deepseek.com',
    keyGuide:
      '1. Go to platform.deepseek.com\n2. Sign up for free\n3. Go to API Keys\n4. Create a new key\n5. Copy the key',
    keyAcquisitionGuide: {
      steps: [
        { step: 1, instruction: 'Go to platform.deepseek.com' },
        { step: 2, instruction: 'Click "Sign Up" and create an account' },
        { step: 3, instruction: 'Verify your email or phone number' },
        { step: 4, instruction: 'Navigate to "API Keys" in the sidebar' },
        { step: 5, instruction: 'Click "Create New API Key"' },
        { step: 6, instruction: 'Copy the key immediately', note: 'Key starts with "sk-"' },
        { step: 7, instruction: 'Store the key in your password manager' },
      ],
      tips: [
        'DeepSeek R1 excels at math, coding, and reasoning',
        'OpenAI-compatible API',
        '5M tokens/month for dev and side projects',
      ],
      gotchas: [
        'API key shown only once — copy immediately',
        'R1 (reasoner) uses more tokens due to chain-of-thought',
        'Higher latency during peak hours',
      ],
      verificationSteps: [
        'curl -s https://api.deepseek.com/v1/models -H "Authorization: Bearer YOUR_API_KEY"',
      ],
    },
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
    model: 'gemini-2.5-flash',
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
    model: 'mistral-small',
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
    model: 'gemini-2.5-pro',
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

  async getProviderComparison(): Promise<Provider[]> {
    await delay(300);
    return [...MOCK_PROVIDERS];
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
