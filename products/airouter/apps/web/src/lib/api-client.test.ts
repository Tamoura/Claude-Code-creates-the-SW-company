import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient } from './api-client';
import { TokenManager } from './token-manager';

beforeEach(() => {
  TokenManager.clearToken();
});

describe('apiClient - Auth', () => {
  it('login stores token and returns user data', async () => {
    const result = await apiClient.login('test@example.com', 'password123');

    expect(result.email).toBe('test@example.com');
    expect(result.id).toBeDefined();
    expect(result.token).toBeDefined();
    expect(TokenManager.hasToken()).toBe(true);
  });

  it('login rejects empty email', async () => {
    await expect(apiClient.login('', 'password123')).rejects.toThrow(
      'Email and password are required'
    );
  });

  it('login rejects short password', async () => {
    await expect(apiClient.login('test@example.com', '12345')).rejects.toThrow(
      'Invalid credentials'
    );
  });

  it('signup returns user data and stores token', async () => {
    const result = await apiClient.signup(
      'new@example.com',
      'password123',
      'password123'
    );

    expect(result.email).toBe('new@example.com');
    expect(result.id).toBeDefined();
    expect(TokenManager.hasToken()).toBe(true);
  });

  it('signup rejects mismatched passwords', async () => {
    await expect(
      apiClient.signup('new@example.com', 'password123', 'differentpass')
    ).rejects.toThrow('Passwords do not match');
  });

  it('signup rejects short password', async () => {
    await expect(
      apiClient.signup('new@example.com', 'short', 'short')
    ).rejects.toThrow('Password must be at least 8 characters');
  });

  it('logout clears the token', async () => {
    await apiClient.login('test@example.com', 'password123');
    expect(TokenManager.hasToken()).toBe(true);

    await apiClient.logout();
    expect(TokenManager.hasToken()).toBe(false);
  });
});

describe('apiClient - Providers', () => {
  it('listProviders returns all 10 providers', async () => {
    const providers = await apiClient.listProviders();

    expect(providers.length).toBe(10);
    expect(providers.map((p) => p.name)).toContain('Google Gemini');
    expect(providers.map((p) => p.name)).toContain('Groq');
    expect(providers.map((p) => p.name)).toContain('DeepSeek');
  });

  it('each provider has required fields', async () => {
    const providers = await apiClient.listProviders();

    for (const provider of providers) {
      expect(provider.id).toBeDefined();
      expect(provider.name).toBeDefined();
      expect(provider.slug).toBeDefined();
      expect(provider.description).toBeDefined();
      expect(provider.freeTierLimits).toBeDefined();
      expect(provider.models.length).toBeGreaterThan(0);
      expect(['operational', 'degraded', 'down']).toContain(provider.status);
      expect(provider.website).toBeDefined();
      expect(provider.keyGuide).toBeDefined();
    }
  });

  it('getProvider returns a specific provider', async () => {
    const provider = await apiClient.getProvider('groq');

    expect(provider).toBeDefined();
    expect(provider?.name).toBe('Groq');
    expect(provider?.models).toContain('llama-3.3-70b');
  });

  it('getProvider returns undefined for unknown id', async () => {
    const provider = await apiClient.getProvider('nonexistent');

    expect(provider).toBeUndefined();
  });

  it('getProviderGuide returns guide text', async () => {
    const guide = await apiClient.getProviderGuide('google-gemini');

    expect(guide).toContain('ai.google.dev');
  });
});

describe('apiClient - Key Vault', () => {
  it('listKeys returns stored keys', async () => {
    const keys = await apiClient.listKeys();

    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key.id).toBeDefined();
      expect(key.providerId).toBeDefined();
      expect(key.providerName).toBeDefined();
      expect(key.keyPrefix).toBeDefined();
      expect(['valid', 'invalid', 'expired']).toContain(key.status);
    }
  });

  it('addKey adds a new key and returns it', async () => {
    const before = await apiClient.listKeys();
    const added = await apiClient.addKey('google-gemini', 'test-api-key-123');
    const after = await apiClient.listKeys();

    expect(added.providerId).toBe('google-gemini');
    expect(added.providerName).toBe('Google Gemini');
    expect(added.status).toBe('valid');
    expect(after.length).toBe(before.length + 1);
  });

  it('addKey rejects unknown provider', async () => {
    await expect(
      apiClient.addKey('unknown-provider', 'some-key')
    ).rejects.toThrow('Provider not found');
  });

  it('testKey returns valid for existing keys', async () => {
    const keys = await apiClient.listKeys();
    const result = await apiClient.testKey(keys[0].id);

    expect(result.valid).toBe(true);
    expect(result.message).toBeDefined();
  });

  it('testKey rejects unknown key', async () => {
    await expect(apiClient.testKey('unknown-key')).rejects.toThrow(
      'Key not found'
    );
  });
});

describe('apiClient - Usage', () => {
  it('getUsage returns stats', async () => {
    const stats = await apiClient.getUsage();

    expect(stats.totalRequestsToday).toBeGreaterThan(0);
    expect(stats.activeProviders).toBeGreaterThan(0);
    expect(stats.freeCapacityEstimate).toBeDefined();
    expect(stats.requestsThisMonth).toBeGreaterThan(0);
  });

  it('getRecentRequests returns request data', async () => {
    const requests = await apiClient.getRecentRequests();

    expect(requests.length).toBeGreaterThan(0);
    for (const req of requests) {
      expect(req.id).toBeDefined();
      expect(req.model).toBeDefined();
      expect(req.provider).toBeDefined();
      expect(['success', 'error']).toContain(req.status);
    }
  });

  it('getProviderUsage returns per-provider stats', async () => {
    const usage = await apiClient.getProviderUsage();

    expect(usage.length).toBeGreaterThan(0);
    for (const entry of usage) {
      expect(entry.providerId).toBeDefined();
      expect(entry.providerName).toBeDefined();
      expect(entry.requestCount).toBeGreaterThan(0);
    }
  });
});

describe('apiClient - Chat Completions', () => {
  it('returns a response with provider attribution', async () => {
    const result = await apiClient.chatCompletions('auto', [
      { role: 'user', content: 'Hello' },
    ]);

    expect(result.id).toBeDefined();
    expect(result.provider).toBeDefined();
    expect(result.model).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.tokens.total).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThan(0);
  });

  it('includes user message in mock response', async () => {
    const result = await apiClient.chatCompletions('auto', [
      { role: 'user', content: 'What is AIRouter?' },
    ]);

    expect(result.content).toContain('What is AIRouter?');
  });
});
