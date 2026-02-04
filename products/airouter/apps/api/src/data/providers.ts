import { Provider } from '../types/index.js';

export const providers: Provider[] = [
  {
    slug: 'google-gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiFormat: 'google',
    freeTier: {
      requestsPerDay: 1000,
      requestsPerMinute: 15,
    },
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1048576 },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 1048576 },
    ],
    keyAcquisitionUrl: 'https://aistudio.google.com/apikey',
    keyAcquisitionGuide: '1. Go to Google AI Studio\n2. Click "Get API Key"\n3. Create a new key or use existing Google Cloud project\n4. Copy the API key',
    healthStatus: 'up',
    authHeader: 'x-goog-api-key',
    authPrefix: '',
  },
  {
    slug: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiFormat: 'openai',
    freeTier: {
      requestsPerDay: 1000,
      requestsPerMinute: 30,
    },
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', contextWindow: 131072 },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', contextWindow: 131072 },
    ],
    keyAcquisitionUrl: 'https://console.groq.com/keys',
    keyAcquisitionGuide: '1. Sign up at console.groq.com\n2. Go to API Keys section\n3. Click "Create API Key"\n4. Name your key and copy it',
    healthStatus: 'up',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
  {
    slug: 'cerebras',
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    apiFormat: 'openai',
    freeTier: {
      tokensPerDay: 1000000,
      requestsPerMinute: 30,
    },
    models: [
      { id: 'llama3.1-8b', name: 'Llama 3.1 8B', contextWindow: 8192 },
      { id: 'llama3.3-70b', name: 'Llama 3.3 70B', contextWindow: 8192 },
    ],
    keyAcquisitionUrl: 'https://cloud.cerebras.ai/',
    keyAcquisitionGuide: '1. Sign up at cloud.cerebras.ai\n2. Navigate to API Keys\n3. Generate a new API key\n4. Copy and store securely',
    healthStatus: 'up',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
  {
    slug: 'sambanova',
    name: 'SambaNova',
    baseUrl: 'https://api.sambanova.ai/v1',
    apiFormat: 'openai',
    freeTier: {
      unlimited: true,
      requestsPerMinute: 30,
    },
    models: [
      { id: 'Meta-Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', contextWindow: 8192 },
      { id: 'Meta-Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B', contextWindow: 8192 },
    ],
    keyAcquisitionUrl: 'https://cloud.sambanova.ai/',
    keyAcquisitionGuide: '1. Sign up at cloud.sambanova.ai\n2. Go to API section\n3. Create an API key\n4. Copy the key',
    healthStatus: 'up',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
  {
    slug: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiFormat: 'openai',
    freeTier: {
      requestsPerDay: 50,
      requestsPerMinute: 20,
    },
    models: [
      { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)', contextWindow: 131072 },
      { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', contextWindow: 8192 },
    ],
    keyAcquisitionUrl: 'https://openrouter.ai/keys',
    keyAcquisitionGuide: '1. Sign up at openrouter.ai\n2. Go to Keys page\n3. Create a new key\n4. Use free-tier models (marked with :free suffix)',
    healthStatus: 'up',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
  {
    slug: 'cohere',
    name: 'Cohere',
    baseUrl: 'https://api.cohere.ai/v2',
    apiFormat: 'cohere',
    freeTier: {
      requestsPerMonth: 1000,
      requestsPerMinute: 20,
    },
    models: [
      { id: 'command-r-plus', name: 'Command R+', contextWindow: 128000 },
    ],
    keyAcquisitionUrl: 'https://dashboard.cohere.com/api-keys',
    keyAcquisitionGuide: '1. Sign up at cohere.com\n2. Go to Dashboard > API Keys\n3. Create a trial API key\n4. Copy the key',
    healthStatus: 'up',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
  {
    slug: 'huggingface',
    name: 'HuggingFace',
    baseUrl: 'https://api-inference.huggingface.co',
    apiFormat: 'custom',
    freeTier: {
      requestsPerDay: 1000,
      requestsPerMinute: 30,
    },
    models: [
      { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', contextWindow: 8192 },
      { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B', contextWindow: 32768 },
    ],
    keyAcquisitionUrl: 'https://huggingface.co/settings/tokens',
    keyAcquisitionGuide: '1. Sign up at huggingface.co\n2. Go to Settings > Access Tokens\n3. Create a new token with "read" permission\n4. Copy the token',
    healthStatus: 'up',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
  {
    slug: 'mistral',
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    apiFormat: 'openai',
    freeTier: {
      requestsPerSecond: 1,
      requestsPerMinute: 60,
    },
    models: [
      { id: 'mistral-small-latest', name: 'Mistral Small', contextWindow: 32000 },
    ],
    keyAcquisitionUrl: 'https://console.mistral.ai/api-keys',
    keyAcquisitionGuide: '1. Sign up at console.mistral.ai\n2. Go to API Keys section\n3. Create a new API key\n4. Copy and store the key',
    healthStatus: 'up',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
  {
    slug: 'cloudflare',
    name: 'Cloudflare Workers AI',
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts',
    apiFormat: 'custom',
    freeTier: {
      neuronsPerDay: 10000,
      requestsPerMinute: 60,
    },
    models: [
      { id: '@cf/meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', contextWindow: 4096 },
      { id: '@cf/mistral/mistral-7b-instruct-v0.2', name: 'Mistral 7B', contextWindow: 4096 },
    ],
    keyAcquisitionUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    keyAcquisitionGuide: '1. Sign up at cloudflare.com\n2. Go to My Profile > API Tokens\n3. Create a token with Workers AI permissions\n4. Copy the token',
    healthStatus: 'up',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
  {
    slug: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiFormat: 'openai',
    freeTier: {
      tokensPerMonth: 5000000,
      requestsPerMinute: 60,
    },
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', contextWindow: 65536 },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', contextWindow: 65536 },
    ],
    keyAcquisitionUrl: 'https://platform.deepseek.com/api_keys',
    keyAcquisitionGuide: '1. Sign up at platform.deepseek.com\n2. Go to API Keys page\n3. Create a new API key\n4. Copy the key (shown only once)',
    healthStatus: 'up',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
];

export function getProviderBySlug(slug: string): Provider | undefined {
  return providers.find(p => p.slug === slug);
}

export function getProvidersForModel(modelId: string): Provider[] {
  return providers.filter(p => p.models.some(m => m.id === modelId));
}
