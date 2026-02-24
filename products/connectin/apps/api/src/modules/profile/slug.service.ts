import { PrismaClient } from '@prisma/client';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../lib/errors';

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
const MIN_LENGTH = 3;

export class SlugService {
  constructor(private readonly prisma: PrismaClient) {}

  async setSlug(userId: string, slug: string) {
    // Validate format
    if (slug.length < MIN_LENGTH) {
      throw new ValidationError('Slug must be at least 3 characters');
    }
    if (!SLUG_REGEX.test(slug)) {
      throw new ValidationError(
        'Slug must contain only lowercase letters, numbers, and hyphens'
      );
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    // Check uniqueness (excluding own profile)
    const existing = await this.prisma.profile.findUnique({
      where: { slug },
    });
    if (existing && existing.userId !== userId) {
      throw new ConflictError('Slug is already taken');
    }

    const updated = await this.prisma.profile.update({
      where: { userId },
      data: { slug },
    });

    return { slug: updated.slug };
  }

  async getProfileBySlug(slug: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { slug },
      include: {
        user: {
          select: { displayName: true, status: true },
        },
      },
    });

    if (!profile || profile.user.status !== 'ACTIVE') {
      throw new NotFoundError('Profile not found');
    }

    return {
      userId: profile.userId,
      slug: profile.slug,
      displayName: profile.user.displayName,
      headlineEn: profile.headlineEn,
      avatarUrl: profile.avatarUrl,
    };
  }
}
