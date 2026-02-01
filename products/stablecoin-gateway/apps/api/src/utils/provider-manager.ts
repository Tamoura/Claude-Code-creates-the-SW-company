import { ethers } from 'ethers';
import { logger } from './logger.js';

/**
 * ProviderManager
 *
 * Manages multiple RPC providers per blockchain network with automatic
 * failover and health checking. When the primary provider goes down,
 * subsequent providers are tried in order. Failed providers enter a
 * cooldown period before being retried.
 *
 * Health is verified by calling getBlockNumber() on the provider.
 */
export class ProviderManager {
  private providers: Map<string, ethers.JsonRpcProvider[]> = new Map();
  private failedProviders: Map<string, number> = new Map(); // url -> failed_at timestamp
  private healthyCache: Map<string, { provider: ethers.JsonRpcProvider; checkedAt: number }> = new Map();
  private readonly COOLDOWN_MS = 60000; // 1 minute cooldown
  private readonly HEALTH_CACHE_TTL_MS = 30000; // 30 second health cache

  /**
   * Add providers for a network from URL strings.
   * Filters out empty/whitespace-only URLs.
   */
  addProviders(network: string, urls: string[]): void {
    const providers = urls
      .filter(url => url && url.trim())
      .map(url => new ethers.JsonRpcProvider(url.trim()));
    this.providers.set(network, providers);

    logger.info('Providers configured for network', {
      network,
      count: providers.length,
    });
  }

  /**
   * Add pre-constructed provider instances for a network.
   * Primarily used for testing.
   */
  addProvidersDirectly(
    network: string,
    providers: ethers.JsonRpcProvider[]
  ): void {
    this.providers.set(network, providers);
  }

  /**
   * Get a healthy provider for the given network.
   *
   * Iterates through configured providers in order, skipping any
   * that failed within the cooldown period. Each candidate is
   * health-checked via getBlockNumber(). The first provider that
   * responds successfully is returned.
   *
   * Throws if no healthy provider is available.
   */
  async getProvider(network: string): Promise<ethers.JsonRpcProvider> {
    // Return cached healthy provider if within TTL
    const cached = this.healthyCache.get(network);
    if (cached && Date.now() - cached.checkedAt < this.HEALTH_CACHE_TTL_MS) {
      return cached.provider;
    }

    const providers = this.providers.get(network) || [];

    for (const provider of providers) {
      const url = provider._getConnection().url;

      // Skip providers still in cooldown
      const failedAt = this.failedProviders.get(url);
      if (failedAt && Date.now() - failedAt < this.COOLDOWN_MS) {
        continue;
      }

      try {
        await provider.getBlockNumber();
        // Provider is healthy -- clear any prior failure record and cache it
        this.failedProviders.delete(url);
        this.healthyCache.set(network, { provider, checkedAt: Date.now() });
        return provider;
      } catch {
        this.failedProviders.set(url, Date.now());
        this.healthyCache.delete(network);
        logger.warn('Provider failed health check', { network, url });
      }
    }

    throw new Error(`All providers failed for network: ${network}`);
  }
}
