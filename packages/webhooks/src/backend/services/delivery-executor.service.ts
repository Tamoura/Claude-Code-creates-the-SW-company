/**
 * Webhook Delivery Executor Service
 *
 * Handles individual webhook delivery: signing, sending HTTP requests,
 * handling responses, and scheduling retries with exponential backoff.
 */

import { logger } from '@connectsw/shared';
import { signWebhookPayload } from './webhook-signature.service.js';
import { validateWebhookUrl } from '../utils/url-validator.js';
import { decryptSecret } from '../utils/encryption.js';
import { WebhookCircuitBreakerService } from './circuit-breaker.service.js';

/** Minimal Prisma client for delivery updates */
interface PrismaDeliveryClient {
  webhookDelivery: {
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  };
}

// TTL-based secret cache to avoid repeated AES decryption
const secretCache = new Map<string, { value: string; expiresAt: number }>();
const SECRET_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_SECRET_CACHE_SIZE = 1_000;

function getCachedSecret(encrypted: string): string | null {
  const cached = secretCache.get(encrypted);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) secretCache.delete(encrypted);
  return null;
}

function cacheSecret(encrypted: string, decrypted: string): void {
  if (secretCache.size >= MAX_SECRET_CACHE_SIZE) {
    const now = Date.now();
    for (const [k, v] of secretCache.entries()) {
      if (v.expiresAt <= now) secretCache.delete(k);
    }
  }
  if (secretCache.size >= MAX_SECRET_CACHE_SIZE) {
    const excess = secretCache.size - MAX_SECRET_CACHE_SIZE + 100;
    let dropped = 0;
    for (const key of secretCache.keys()) {
      if (dropped >= excess) break;
      secretCache.delete(key);
      dropped++;
    }
  }
  secretCache.set(encrypted, { value: decrypted, expiresAt: Date.now() + SECRET_CACHE_TTL_MS });
}

export function clearSecretCache(): void {
  secretCache.clear();
}

export interface DeliveryRecord {
  id: string;
  endpointId: string;
  eventType: string;
  resourceId: string;
  payload: unknown;
  attempts: number;
  status: string;
  endpoint: {
    id: string;
    url: string;
    secret: string;
    userId: string;
  };
}

export interface WebhookDeliveryExecutorOptions {
  /** Max retry attempts. Default: 5 */
  maxRetries?: number;
  /** Retry delays in seconds. Default: [60, 300, 900, 3600, 7200] */
  retryDelays?: number[];
  /** User-Agent header. Default: 'ConnectSW-Webhooks/1.0' */
  userAgent?: string;
  /** Request timeout in ms. Default: 30000 */
  timeoutMs?: number;
}

export class WebhookDeliveryExecutorService {
  private maxRetries: number;
  private retryDelays: number[];
  private userAgent: string;
  private timeoutMs: number;

  constructor(
    private prisma: PrismaDeliveryClient,
    private circuitBreaker: WebhookCircuitBreakerService,
    opts?: WebhookDeliveryExecutorOptions,
  ) {
    this.maxRetries = opts?.maxRetries ?? 5;
    this.retryDelays = opts?.retryDelays ?? [60, 300, 900, 3600, 7200];
    this.userAgent = opts?.userAgent ?? 'ConnectSW-Webhooks/1.0';
    this.timeoutMs = opts?.timeoutMs ?? 30_000;
  }

  async deliverWebhook(delivery: DeliveryRecord): Promise<void> {
    const { id, endpoint, payload, attempts } = delivery;

    if (await this.circuitBreaker.isCircuitOpen(endpoint.id)) {
      logger.warn('Circuit breaker open — skipping delivery', { deliveryId: id, endpointId: endpoint.id });
      return;
    }

    try {
      await this.prisma.webhookDelivery.update({
        where: { id },
        data: { status: 'DELIVERING', lastAttemptAt: new Date(), attempts: { increment: 1 } },
      });

      // Validate URL (SSRF protection)
      try {
        await validateWebhookUrl(endpoint.url);
      } catch (err) {
        await this.prisma.webhookDelivery.update({
          where: { id },
          data: { status: 'FAILED', errorMessage: `Invalid URL: ${(err as Error).message}`, nextAttemptAt: null },
        });
        await this.circuitBreaker.recordFailure(endpoint.id);
        return;
      }

      // Decrypt secret
      let secret: string;
      try {
        if (process.env.WEBHOOK_ENCRYPTION_KEY) {
          const cached = getCachedSecret(endpoint.secret);
          secret = cached ?? decryptSecret(endpoint.secret);
          if (!cached) cacheSecret(endpoint.secret, secret);
        } else {
          secret = endpoint.secret;
        }
      } catch (err) {
        await this.handleFailure(id, attempts + 1, null, null, 'Secret decryption failed');
        await this.circuitBreaker.recordFailure(endpoint.id);
        return;
      }

      // Sign and send
      const timestamp = Math.floor(Date.now() / 1000);
      const payloadString = JSON.stringify(payload);
      const signature = signWebhookPayload(payloadString, secret, timestamp);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp.toString(),
          'X-Webhook-ID': id,
          'User-Agent': this.userAgent,
        },
        body: payloadString,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      const responseBody = await response.text().catch(() => '');

      if (response.status >= 200 && response.status < 300) {
        await this.prisma.webhookDelivery.update({
          where: { id },
          data: {
            status: 'SUCCEEDED',
            succeededAt: new Date(),
            responseCode: response.status,
            responseBody: responseBody.substring(0, 10_000),
          },
        });
        logger.info('Webhook delivered', { deliveryId: id, endpointId: endpoint.id, status: response.status });
        await this.circuitBreaker.recordSuccess(endpoint.id);
      } else {
        await this.handleFailure(id, attempts + 1, response.status, responseBody, `HTTP ${response.status}`);
        await this.circuitBreaker.recordFailure(endpoint.id);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await this.handleFailure(id, attempts + 1, null, null, msg);
      await this.circuitBreaker.recordFailure(endpoint.id);
    }
  }

  async handleFailure(
    deliveryId: string,
    attempts: number,
    responseCode: number | null,
    responseBody: string | null,
    errorMessage: string,
  ): Promise<void> {
    if (attempts < this.maxRetries) {
      const baseDelay = this.retryDelays[attempts - 1] || 7200;
      const jitter = Math.floor(baseDelay * 0.1 * Math.random());
      const nextAttemptAt = new Date(Date.now() + (baseDelay + jitter) * 1000);

      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'FAILED',
          responseCode,
          responseBody: responseBody?.substring(0, 10_000),
          errorMessage: errorMessage.substring(0, 1000),
          nextAttemptAt,
        },
      });
      logger.warn('Webhook failed, will retry', { deliveryId, attempts, nextAttemptAt });
    } else {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'FAILED',
          responseCode,
          responseBody: responseBody?.substring(0, 10_000),
          errorMessage: `Max retries (${this.maxRetries}) exceeded: ${errorMessage}`.substring(0, 1000),
          nextAttemptAt: null,
        },
      });
      logger.error('Webhook permanently failed', { deliveryId, attempts });
    }
  }
}
