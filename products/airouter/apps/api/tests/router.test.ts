import './setup';
import { initializeEncryption, encryptSecret } from '../src/utils/encryption';
import { RouterService, ChatCompletionRequest, ChatCompletionResponse } from '../src/services/router.service';
import { Provider } from '../src/types';

// Mock PrismaClient
function createMockPrisma(overrides: any = {}) {
  return {
    providerKey: {
      findMany: overrides.findManyKeys || jest.fn().mockResolvedValue([]),
    },
    usageRecord: {
      findUnique: overrides.findUsage || jest.fn().mockResolvedValue(null),
      upsert: overrides.upsertUsage || jest.fn().mockResolvedValue({}),
      findMany: overrides.findManyUsage || jest.fn().mockResolvedValue([]),
    },
  } as any;
}

describe('RouterService', () => {
  beforeAll(() => {
    initializeEncryption();
  });

  describe('selectProvider', () => {
    it('should throw when user has no provider keys', async () => {
      const prisma = createMockPrisma();
      const router = new RouterService(prisma);

      await expect(router.selectProvider('user1')).rejects.toThrow('No provider keys configured');
    });

    it('should return providers sorted by capacity', async () => {
      const encryptedKey = encryptSecret('test-api-key');
      // Pre-populate usage so groq has lower capacity than sambanova
      const today = new Date().toISOString().slice(0, 10);
      const prisma = createMockPrisma({
        findManyKeys: jest.fn().mockResolvedValue([
          { id: 'k1', provider: 'groq', encryptedKey, isValid: true },
          { id: 'k2', provider: 'sambanova', encryptedKey, isValid: true },
        ]),
        findUsage: jest.fn().mockImplementation(({ where }: any) => {
          // Groq has used 900 of 1000 RPD
          if (where.userId_provider_date?.provider === 'groq') {
            return Promise.resolve({ requestCount: 900, tokenCount: 0 });
          }
          return Promise.resolve(null);
        }),
      });

      const router = new RouterService(prisma);
      const candidates = await router.selectProvider('user1');

      // SambaNova has unlimited free tier (capacity 1.0), Groq has 10% remaining
      expect(candidates.length).toBe(2);
      expect(candidates[0].provider.slug).toBe('sambanova');
      expect(candidates[1].provider.slug).toBe('groq');
    });

    it('should filter by model when specified', async () => {
      const encryptedKey = encryptSecret('test-key');
      const prisma = createMockPrisma({
        findManyKeys: jest.fn().mockResolvedValue([
          { id: 'k1', provider: 'groq', encryptedKey, isValid: true },
          { id: 'k2', provider: 'deepseek', encryptedKey, isValid: true },
        ]),
      });

      const router = new RouterService(prisma);
      const candidates = await router.selectProvider('user1', 'deepseek-chat');

      expect(candidates.length).toBe(1);
      expect(candidates[0].provider.slug).toBe('deepseek');
    });

    it('should skip invalid keys', async () => {
      const encryptedKey = encryptSecret('test-key');
      const prisma = createMockPrisma({
        findManyKeys: jest.fn().mockResolvedValue([
          { id: 'k1', provider: 'groq', encryptedKey, isValid: false },
        ]),
      });
      // findMany is called with isValid: true, so mock returns empty
      prisma.providerKey.findMany = jest.fn().mockResolvedValue([]);

      const router = new RouterService(prisma);
      await expect(router.selectProvider('user1')).rejects.toThrow('No provider keys configured');
    });
  });

  describe('routeCompletion', () => {
    it('should route to the first available provider', async () => {
      const encryptedKey = encryptSecret('test-api-key');
      const prisma = createMockPrisma({
        findManyKeys: jest.fn().mockResolvedValue([
          { id: 'k1', provider: 'groq', encryptedKey, isValid: true },
        ]),
      });

      const router = new RouterService(prisma);
      const mockCall = jest.fn().mockResolvedValue({
        id: 'cmpl-1',
        object: 'chat.completion',
        created: Date.now(),
        model: 'llama-3.3-70b',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hello!' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      } as ChatCompletionResponse);

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await router.routeCompletion('user1', request, mockCall);

      expect(response.provider).toBe('groq');
      expect(mockCall).toHaveBeenCalledTimes(1);
    });

    it('should failover to next provider on error', async () => {
      const encryptedKey = encryptSecret('test-api-key');
      const prisma = createMockPrisma({
        findManyKeys: jest.fn().mockResolvedValue([
          { id: 'k1', provider: 'groq', encryptedKey, isValid: true },
          { id: 'k2', provider: 'cerebras', encryptedKey, isValid: true },
        ]),
      });

      const router = new RouterService(prisma);
      let firstProviderCalled: string | null = null;
      const mockCall = jest.fn().mockImplementation((provider: Provider) => {
        if (!firstProviderCalled) {
          firstProviderCalled = provider.slug;
          throw new Error('Rate limited');
        }
        return Promise.resolve({
          id: 'cmpl-2',
          object: 'chat.completion',
          created: Date.now(),
          model: 'llama-3.3-70b',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Fallback!' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        } as ChatCompletionResponse);
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await router.routeCompletion('user1', request, mockCall);

      expect(mockCall).toHaveBeenCalledTimes(2);
      // The second provider should have succeeded
      expect(response.provider).not.toBe(firstProviderCalled);
    });

    it('should throw when all providers fail', async () => {
      const encryptedKey = encryptSecret('test-api-key');
      const prisma = createMockPrisma({
        findManyKeys: jest.fn().mockResolvedValue([
          { id: 'k1', provider: 'groq', encryptedKey, isValid: true },
        ]),
      });

      const router = new RouterService(prisma);
      const mockCall = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(
        router.routeCompletion('user1', request, mockCall)
      ).rejects.toThrow('All providers failed');
    });
  });
});
