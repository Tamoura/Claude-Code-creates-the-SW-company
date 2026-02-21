import { PrismaClient, ConsentType } from '@prisma/client';
import { GrantConsentInput } from './consent.schemas';

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

  async listConsents(userId: string) {
    const consents = await this.prisma.consent.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
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

    return consents;
  }
}
