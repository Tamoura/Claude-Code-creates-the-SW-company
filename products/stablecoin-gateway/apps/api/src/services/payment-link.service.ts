import { PrismaClient, PaymentLink, Prisma } from '@prisma/client';
import { AppError } from '../types/index.js';
import * as crypto from 'crypto';

/**
 * Custom base62 encoder for short codes
 * Uses alphanumeric characters (0-9, a-z, A-Z) to create URL-friendly codes
 */
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateShortCode(): string {
  // Generate 5 random bytes (40 bits) and convert to base62 for an ~8 char code
  const bytes = crypto.randomBytes(5);
  let num = BigInt('0x' + bytes.toString('hex'));
  let result = '';

  while (num > 0) {
    result = BASE62_CHARS[Number(num % 62n)] + result;
    num = num / 62n;
  }

  // Pad to 8 characters with leading zeros if needed
  return result.padStart(8, '0');
}

export interface CreatePaymentLinkData {
  name?: string;
  amount?: number; // null = customer chooses amount
  currency?: string;
  network?: string;
  token?: string;
  merchant_address: string;
  success_url?: string;
  cancel_url?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  max_usages?: number; // null = unlimited
  expires_at?: Date;
}

export interface UpdatePaymentLinkData {
  name?: string;
  active?: boolean;
  success_url?: string;
  cancel_url?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  max_usages?: number;
  expires_at?: Date;
}

export interface PaymentLinkFilters {
  limit?: number;
  offset?: number;
  active?: boolean;
  created_after?: Date;
  created_before?: Date;
}

export interface PaymentLinkResponse {
  id: string;
  short_code: string;
  name: string | null;
  amount: number | null;
  currency: string;
  network: string;
  token: string;
  merchant_address: string;
  success_url: string | null;
  cancel_url: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  active: boolean;
  usage_count: number;
  max_usages: number | null;
  payment_url: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export class PaymentLinkService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new payment link with a unique short code
   * Retries up to 5 times if short code collision occurs
   */
  async createPaymentLink(
    userId: string,
    data: CreatePaymentLinkData
  ): Promise<PaymentLink> {
    const maxRetries = 5;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const shortCode = generateShortCode();

        const paymentLink = await this.prisma.paymentLink.create({
          data: {
            userId,
            shortCode,
            name: data.name,
            amount: data.amount !== undefined && data.amount !== null ? data.amount : null,
            currency: data.currency || 'USD',
            network: data.network || 'polygon',
            token: data.token || 'USDC',
            merchantAddress: data.merchant_address,
            successUrl: data.success_url,
            cancelUrl: data.cancel_url,
            description: data.description,
            metadata: data.metadata as any,
            maxUsages: data.max_usages,
            expiresAt: data.expires_at,
            active: true,
            usageCount: 0,
          },
        });

        return paymentLink;
      } catch (error) {
        // If it's a unique constraint violation on shortCode, retry
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          error.meta?.target &&
          Array.isArray(error.meta.target) &&
          error.meta.target.includes('shortCode')
        ) {
          lastError = error;
          continue; // Try again with a new short code
        }
        // For any other error, rethrow immediately
        throw error;
      }
    }

    // If we exhausted all retries, throw an error
    throw new AppError(
      500,
      'short-code-generation-failed',
      'Failed to generate unique short code after multiple attempts',
      lastError
    );
  }

  /**
   * Get payment link by ID (authenticated - requires user ownership)
   */
  async getPaymentLink(id: string, userId: string): Promise<PaymentLink> {
    const link = await this.prisma.paymentLink.findFirst({
      where: { id, userId },
    });

    if (!link) {
      throw new AppError(404, 'not-found', 'Payment link not found');
    }

    return link;
  }

  /**
   * Get payment link by short code (public - no auth required)
   * Used for resolving short URLs like /pay/abc123xy
   */
  async getPaymentLinkByShortCode(shortCode: string): Promise<PaymentLink> {
    const link = await this.prisma.paymentLink.findUnique({
      where: { shortCode },
    });

    if (!link) {
      throw new AppError(404, 'not-found', 'Payment link not found');
    }

    // Validate link is still usable
    if (!link.active) {
      throw new AppError(400, 'link-inactive', 'Payment link is no longer active');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new AppError(400, 'link-expired', 'Payment link has expired');
    }

    if (link.maxUsages !== null && link.usageCount >= link.maxUsages) {
      throw new AppError(
        400,
        'link-max-usage-reached',
        'Payment link has reached maximum usage limit'
      );
    }

    return link;
  }

  /**
   * List payment links for a user with pagination
   */
  async listPaymentLinks(
    userId: string,
    filters: PaymentLinkFilters
  ): Promise<{ data: PaymentLink[]; total: number }> {
    const where: Prisma.PaymentLinkWhereInput = { userId };

    if (filters.active !== undefined) {
      where.active = filters.active;
    }

    if (filters.created_after || filters.created_before) {
      where.createdAt = {};
      if (filters.created_after) {
        where.createdAt.gte = filters.created_after;
      }
      if (filters.created_before) {
        where.createdAt.lte = filters.created_before;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.paymentLink.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(filters.limit || 50, 100),
        skip: Math.max(filters.offset || 0, 0),
      }),
      this.prisma.paymentLink.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Update payment link (authenticated)
   * Note: short_code, amount, network, token, and merchant_address are immutable
   */
  async updatePaymentLink(
    id: string,
    userId: string,
    data: UpdatePaymentLinkData
  ): Promise<PaymentLink> {
    // Verify ownership
    const existingLink = await this.getPaymentLink(id, userId);

    const updateData: Prisma.PaymentLinkUpdateInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.active !== undefined) {
      updateData.active = data.active;
    }

    if (data.success_url !== undefined) {
      updateData.successUrl = data.success_url;
    }

    if (data.cancel_url !== undefined) {
      updateData.cancelUrl = data.cancel_url;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata as any;
    }

    if (data.max_usages !== undefined) {
      updateData.maxUsages = data.max_usages;
    }

    if (data.expires_at !== undefined) {
      updateData.expiresAt = data.expires_at;
    }

    return this.prisma.paymentLink.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Deactivate payment link (soft delete)
   */
  async deactivatePaymentLink(id: string, userId: string): Promise<PaymentLink> {
    // Verify ownership
    await this.getPaymentLink(id, userId);

    return this.prisma.paymentLink.update({
      where: { id },
      data: { active: false },
    });
  }

  /**
   * Atomically increment usage count and enforce max_usages in a single SQL query.
   * Uses a WHERE clause to enforce the limit at the database level,
   * preventing race conditions where concurrent requests both pass
   * a read-then-check before either increments.
   *
   * RISK-064: userId is required to enforce ownership — prevents user A
   * from incrementing user B's payment link usage count.
   *
   * Returns the updated link, or null if the link has reached max_usages
   * or ownership does not match.
   */
  async incrementUsage(id: string, userId: string): Promise<PaymentLink | null> {
    // Atomic increment with limit + ownership enforcement in a single UPDATE ... WHERE.
    // "maxUsages" IS NULL means unlimited; otherwise usageCount must be < maxUsages.
    const result: PaymentLink[] = await this.prisma.$queryRaw`
      UPDATE "PaymentLink"
      SET "usageCount" = "usageCount" + 1, "updatedAt" = NOW()
      WHERE id = ${id}
        AND "userId" = ${userId}
        AND active = true
        AND ("maxUsages" IS NULL OR "usageCount" < "maxUsages")
      RETURNING *
    `;

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Transform PaymentLink model to API response format
   */
  toResponse(link: PaymentLink, baseUrl: string): PaymentLinkResponse {
    return {
      id: link.id,
      short_code: link.shortCode,
      name: link.name,
      amount: link.amount ? Number(link.amount) : null,
      currency: link.currency,
      network: link.network,
      token: link.token,
      merchant_address: link.merchantAddress,
      success_url: link.successUrl,
      cancel_url: link.cancelUrl,
      description: link.description,
      metadata: link.metadata as any,
      active: link.active,
      usage_count: link.usageCount,
      max_usages: link.maxUsages,
      payment_url: `${baseUrl}/pay/${link.shortCode}`,
      created_at: link.createdAt.toISOString(),
      updated_at: link.updatedAt.toISOString(),
      expires_at: link.expiresAt?.toISOString() || null,
    };
  }
}
