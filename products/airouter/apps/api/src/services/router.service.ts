import { PrismaClient } from '@prisma/client';
import { getProviderBySlug } from '../data/providers.js';
import { decryptSecret } from '../utils/encryption.js';
import { UsageService } from './usage.service.js';
import { logger } from '../utils/logger.js';
import { AppError, Provider } from '../types/index.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  provider: string;
}

export class RouterService {
  private usageService: UsageService;

  constructor(private prisma: PrismaClient) {
    this.usageService = new UsageService(prisma);
  }

  /**
   * Select the best provider for a request based on available keys and remaining capacity.
   * Returns providers sorted by remaining capacity (highest first).
   */
  async selectProvider(userId: string, preferredModel?: string): Promise<Array<{
    provider: Provider;
    providerKey: { id: string; encryptedKey: string };
    capacity: number;
  }>> {
    // Get all valid provider keys for this user
    const userKeys = await this.prisma.providerKey.findMany({
      where: { userId, isValid: true },
    });

    if (userKeys.length === 0) {
      throw new AppError(400, 'no-provider-keys', 'No provider keys configured. Add at least one provider key to use the router.');
    }

    // Score each provider by remaining capacity
    const candidates: Array<{
      provider: Provider;
      providerKey: { id: string; encryptedKey: string };
      capacity: number;
    }> = [];

    for (const key of userKeys) {
      const provider = getProviderBySlug(key.provider);
      if (!provider || provider.healthStatus === 'down') continue;

      // If a specific model is requested, check if this provider has it
      if (preferredModel && !provider.models.some(m => m.id === preferredModel)) {
        continue;
      }

      const capacity = await this.usageService.getRemainingCapacity(userId, key.provider);

      if (capacity > 0) {
        candidates.push({
          provider,
          providerKey: { id: key.id, encryptedKey: key.encryptedKey },
          capacity,
        });
      }
    }

    if (candidates.length === 0) {
      throw new AppError(429, 'all-providers-exhausted', 'All configured providers have reached their free tier limits. Try again tomorrow.');
    }

    // Sort by capacity (highest first), with 'up' status preferred over 'degraded'
    candidates.sort((a, b) => {
      if (a.provider.healthStatus === 'up' && b.provider.healthStatus !== 'up') return -1;
      if (b.provider.healthStatus === 'up' && a.provider.healthStatus !== 'up') return 1;
      return b.capacity - a.capacity;
    });

    return candidates;
  }

  /**
   * Route a chat completion request to the best available provider.
   * Implements failover: if the first provider fails, try the next one.
   */
  async routeCompletion(
    userId: string,
    request: ChatCompletionRequest,
    makeProviderCall: (provider: Provider, apiKey: string, request: ChatCompletionRequest) => Promise<ChatCompletionResponse>
  ): Promise<ChatCompletionResponse> {
    const candidates = await this.selectProvider(userId, request.model);

    let lastError: Error | null = null;

    for (const candidate of candidates) {
      try {
        const apiKey = decryptSecret(candidate.providerKey.encryptedKey);

        const response = await makeProviderCall(candidate.provider, apiKey, request);

        // Record usage
        const totalTokens = response.usage?.total_tokens ?? 0;
        await this.usageService.recordUsage(userId, candidate.provider.slug, totalTokens);

        return {
          ...response,
          provider: candidate.provider.slug,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn('Provider call failed, trying next', {
          provider: candidate.provider.slug,
          error: lastError.message,
        });
        continue;
      }
    }

    throw new AppError(
      502,
      'all-providers-failed',
      `All providers failed. Last error: ${lastError?.message ?? 'unknown'}`,
    );
  }
}
