/**
 * Webhook Delivery Executor Service
 *
 * Handles individual webhook delivery: signing, sending HTTP requests,
 * handling responses, and scheduling retries with exponential backoff.
 */

import { PrismaClient, WebhookStatus } from '@prisma/client';
import { signWebhookPayload } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { validateWebhookUrl } from '../utils/url-validator.js';
import { decryptSecret } from '../utils/encryption.js';
import { WebhookCircuitBreakerService } from './webhook-circuit-breaker.service.js';

/**
 * TTL-based in-memory cache for decrypted webhook secrets.
 *
 * Problem: decryptSecret() performs AES-256-GCM decryption on every
 * webhook delivery. For high-throughput endpoints receiving many events,
 * this repeated crypto work is unnecessary since the encrypted secret
 * rarely changes.
 *
 * Solution: Cache decrypted secrets keyed by their encrypted form.
 * Entries expire after 5 minutes (SECRET_CACHE_TTL_MS) to bound
 * memory usage and ensure rotated secrets are picked up promptly.
 *
 * Security: The cache lives in process memory only. It is never
 * serialized, logged, or persisted. The 5-minute TTL limits the
 * window during which a rotated secret's old value remains cached.
 */
const secretCache = new Map<string, { value: string; expiresAt: number }>();
const SECRET_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SECRET_CACHE_SIZE = 1_000; // RISK-063: bound cache memory

function getCachedSecret(encryptedSecret: string): string | null {
  const cached = secretCache.get(encryptedSecret);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  if (cached) {
    secretCache.delete(encryptedSecret);
  }
  return null;
}

function cacheSecret(encryptedSecret: string, decryptedValue: string): void {
  // RISK-063: Evict expired entries and enforce max cache size
  if (secretCache.size >= MAX_SECRET_CACHE_SIZE) {
    evictExpiredSecrets();
  }
  // If still over limit after evicting expired, drop oldest entries
  if (secretCache.size >= MAX_SECRET_CACHE_SIZE) {
    const excess = secretCache.size - MAX_SECRET_CACHE_SIZE + 100; // drop 100 oldest
    let dropped = 0;
    for (const key of secretCache.keys()) {
      if (dropped >= excess) break;
      secretCache.delete(key);
      dropped++;
    }
  }
  secretCache.set(encryptedSecret, {
    value: decryptedValue,
    expiresAt: Date.now() + SECRET_CACHE_TTL_MS,
  });
}

/**
 * RISK-063: Remove all expired entries from the secret cache.
 * Called automatically when the cache approaches its size limit.
 * Exposed for testing and manual cache maintenance.
 */
export function evictExpiredSecrets(): number {
  const now = Date.now();
  let evicted = 0;
  for (const [key, entry] of secretCache.entries()) {
    if (entry.expiresAt <= now) {
      secretCache.delete(key);
      evicted++;
    }
  }
  return evicted;
}

/**
 * RISK-066: Invalidate a specific cached secret (e.g., after key rotation).
 * Returns true if the entry was found and removed, false otherwise.
 */
export function invalidateSecretCache(encryptedSecret: string): boolean {
  return secretCache.delete(encryptedSecret);
}

/**
 * Clear all cached secrets. Exposed for testing and secret rotation.
 */
export function clearSecretCache(): void {
  secretCache.clear();
}

/**
 * Get current cache size. Exposed for testing and monitoring.
 */
export function getSecretCacheSize(): number {
  return secretCache.size;
}

export class WebhookDeliveryExecutorService {
  private maxRetries = 5;
  private retryDelays = [60, 300, 900, 3600, 7200]; // 1m, 5m, 15m, 1h, 2h

  constructor(
    private prisma: PrismaClient,
    private circuitBreaker: WebhookCircuitBreakerService
  ) {}

  /**
   * Deliver a single webhook to its endpoint
   */
  async deliverWebhook(delivery: any): Promise<void> {
    const { id, endpoint, payload, attempts } = delivery;

    const circuitOpen = await this.circuitBreaker.isCircuitOpen(endpoint.id);
    if (circuitOpen) {
      logger.warn('Circuit breaker open - skipping webhook delivery', {
        deliveryId: id,
        endpointId: endpoint.id,
        url: endpoint.url,
      });
      return;
    }

    try {
      await this.prisma.webhookDelivery.update({
        where: { id },
        data: {
          status: WebhookStatus.DELIVERING,
          lastAttemptAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      try {
        await validateWebhookUrl(endpoint.url);
      } catch (error) {
        await this.prisma.webhookDelivery.update({
          where: { id },
          data: {
            status: WebhookStatus.FAILED,
            errorMessage: `Invalid webhook URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
            nextAttemptAt: null,
          },
        });
        logger.error('Webhook delivery blocked - invalid URL', {
          deliveryId: id,
          endpointId: endpoint.id,
          url: endpoint.url,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        await this.circuitBreaker.recordFailure(endpoint.id);
        return;
      }

      let secret: string;
      try {
        if (process.env.WEBHOOK_ENCRYPTION_KEY) {
          // Check cache before performing decryption
          const cached = getCachedSecret(endpoint.secret);
          if (cached) {
            secret = cached;
          } else {
            secret = decryptSecret(endpoint.secret);
            cacheSecret(endpoint.secret, secret);
          }
        } else {
          secret = endpoint.secret;
        }
      } catch (decryptError) {
        logger.error('Failed to decrypt webhook secret', {
          deliveryId: id,
          endpointId: endpoint.id,
          error: decryptError instanceof Error ? decryptError.message : 'Unknown error',
        });
        await this.handleDeliveryFailure(id, attempts + 1, null, null, 'Webhook secret decryption failed');
        await this.circuitBreaker.recordFailure(endpoint.id);
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const payloadString = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadString, secret, timestamp);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp.toString(),
          'X-Webhook-ID': delivery.id,
          'User-Agent': 'StablecoinGateway-Webhooks/1.0',
        },
        body: payloadString,
        signal: AbortSignal.timeout(30000),
      });

      const responseBody = await response.text().catch(() => '');

      if (response.status >= 200 && response.status < 300) {
        await this.prisma.webhookDelivery.update({
          where: { id },
          data: {
            status: WebhookStatus.SUCCEEDED,
            succeededAt: new Date(),
            responseCode: response.status,
            responseBody: responseBody.substring(0, 10000),
          },
        });

        logger.info('Webhook delivered successfully', {
          deliveryId: id,
          endpointId: endpoint.id,
          eventType: delivery.eventType,
          attempts: attempts + 1,
          statusCode: response.status,
        });

        await this.circuitBreaker.recordSuccess(endpoint.id);
      } else {
        await this.handleDeliveryFailure(
          id,
          attempts + 1,
          response.status,
          responseBody,
          `HTTP ${response.status}: ${response.statusText}`
        );

        await this.circuitBreaker.recordFailure(endpoint.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.handleDeliveryFailure(id, attempts + 1, null, null, errorMessage);

      logger.error('Webhook delivery failed', {
        deliveryId: id,
        endpointId: endpoint.id,
        eventType: delivery.eventType,
        attempts: attempts + 1,
        error: errorMessage,
      });

      await this.circuitBreaker.recordFailure(endpoint.id);
    }
  }

  /**
   * Handle failed delivery - update status and schedule retry
   */
  async handleDeliveryFailure(
    deliveryId: string,
    attempts: number,
    responseCode: number | null,
    responseBody: string | null,
    errorMessage: string
  ): Promise<void> {
    if (attempts < this.maxRetries) {
      // RISK-076: Add 10% random jitter to prevent thundering herd
      const baseDelay = this.retryDelays[attempts - 1] || 7200;
      const jitter = Math.floor(baseDelay * 0.1 * Math.random());
      const delaySeconds = baseDelay + jitter;
      const nextAttemptAt = new Date(Date.now() + delaySeconds * 1000);

      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: WebhookStatus.FAILED,
          responseCode,
          responseBody: responseBody?.substring(0, 10000),
          errorMessage: errorMessage.substring(0, 1000),
          nextAttemptAt,
        },
      });

      logger.warn('Webhook delivery failed, will retry', {
        deliveryId,
        attempts,
        nextAttemptAt,
        errorMessage,
      });
    } else {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: WebhookStatus.FAILED,
          responseCode,
          responseBody: responseBody?.substring(0, 10000),
          errorMessage: `Max retries (${this.maxRetries}) exceeded: ${errorMessage}`.substring(0, 1000),
          nextAttemptAt: null,
        },
      });

      logger.error('Webhook delivery permanently failed', {
        deliveryId,
        attempts,
        errorMessage,
      });
    }
  }

  /**
   * Get delivery status for a specific webhook delivery
   */
  async getDeliveryStatus(deliveryId: string): Promise<any> {
    return this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        endpoint: {
          select: {
            id: true,
            url: true,
            events: true,
          },
        },
      },
    });
  }
}
