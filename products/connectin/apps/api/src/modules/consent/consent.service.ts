import { PrismaClient, ConsentType } from '@prisma/client';
import { GrantConsentInput } from './consent.schemas';
import {
  decodeCursor,
  encodeCursor,
  CursorPaginationMeta,
} from '../../lib/pagination';

export class ConsentService {
  constructor(private readonly prisma: PrismaClient) {}

  async grantOrRevoke(
    userId: string,
    input: GrantConsentInput,
    meta?: { ip?: string; userAgent?: string }
  ) {
    const consent = await this.prisma.consent.upsert({
      where: {
        userId_type: {
          userId,
          type: input.type as ConsentType,
        },
      },
      update: {
        granted: input.granted,
        version: input.version,
        ipAddress: meta?.ip ?? null,
        userAgent: meta?.userAgent ?? null,
        grantedAt: input.granted ? new Date() : null,
        revokedAt: input.granted ? null : new Date(),
      },
      create: {
        userId,
        type: input.type as ConsentType,
        granted: input.granted,
        version: input.version,
        ipAddress: meta?.ip ?? null,
        userAgent: meta?.userAgent ?? null,
        grantedAt: input.granted ? new Date() : null,
        revokedAt: input.granted ? null : new Date(),
      },
    });

    return {
      id: consent.id,
      type: consent.type,
      granted: consent.granted,
      version: consent.version,
      grantedAt: consent.grantedAt,
      revokedAt: consent.revokedAt,
    };
  }

  async listConsents(
    userId: string,
    options?: { cursor?: string; limit?: number }
  ) {
    const limit = Math.min(
      50,
      Math.max(1, options?.limit ?? 20)
    );

    const cursorData = options?.cursor
      ? decodeCursor(options.cursor)
      : null;

    const where: { userId: string; createdAt?: { lt: Date } } = { userId };

    if (cursorData) {
      where.createdAt = { lt: cursorData.createdAt };
    }

    const consents = await this.prisma.consent.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        type: true,
        granted: true,
        version: true,
        grantedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    const hasMore = consents.length > limit;
    const resultConsents = hasMore
      ? consents.slice(0, limit)
      : consents;

    const lastItem =
      resultConsents.length > 0
        ? resultConsents[resultConsents.length - 1]
        : null;

    const meta: CursorPaginationMeta = {
      cursor: lastItem
        ? encodeCursor(lastItem.createdAt, lastItem.id)
        : null,
      hasMore,
      count: resultConsents.length,
    };

    return { data: resultConsents, meta };
  }
}
