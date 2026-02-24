import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../../lib/errors';

interface WriteRecommendationInput {
  content: string;
  relationship: string;
}

export class RecommendationService {
  constructor(private readonly prisma: PrismaClient) {}

  async writeRecommendation(authorId: string, recipientId: string, input: WriteRecommendationInput) {
    if (authorId === recipientId) {
      throw new BadRequestError('Cannot recommend yourself');
    }

    // Check 1st degree connection
    const connection = await this.prisma.connection.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: authorId, receiverId: recipientId },
          { senderId: recipientId, receiverId: authorId },
        ],
      },
    });
    if (!connection) throw new ForbiddenError('Must be connected to recommend');

    // Check for existing recommendation
    const existing = await this.prisma.recommendation.findUnique({
      where: { authorId_recipientId: { authorId, recipientId } },
    });
    if (existing) throw new ConflictError('You have already written a recommendation for this user');

    const rec = await this.prisma.recommendation.create({
      data: {
        authorId,
        recipientId,
        content: input.content,
        relationship: input.relationship,
        status: 'PENDING',
      },
      include: {
        author: { select: { id: true, displayName: true } },
        recipient: { select: { id: true, displayName: true } },
      },
    });

    return this.format(rec);
  }

  async acceptRecommendation(recId: string, userId: string) {
    const rec = await this.prisma.recommendation.findUnique({
      where: { id: recId },
      include: {
        author: { select: { id: true, displayName: true } },
        recipient: { select: { id: true, displayName: true } },
      },
    });
    if (!rec) throw new NotFoundError('Recommendation not found');
    if (rec.recipientId !== userId) throw new ForbiddenError('Only the recipient can accept');

    const updated = await this.prisma.recommendation.update({
      where: { id: recId },
      data: { status: 'ACCEPTED' },
      include: {
        author: { select: { id: true, displayName: true } },
        recipient: { select: { id: true, displayName: true } },
      },
    });

    return this.format(updated);
  }

  async declineRecommendation(recId: string, userId: string) {
    const rec = await this.prisma.recommendation.findUnique({ where: { id: recId } });
    if (!rec) throw new NotFoundError('Recommendation not found');
    if (rec.recipientId !== userId) throw new ForbiddenError('Only the recipient can decline');

    const updated = await this.prisma.recommendation.update({
      where: { id: recId },
      data: { status: 'DECLINED' },
      include: {
        author: { select: { id: true, displayName: true } },
        recipient: { select: { id: true, displayName: true } },
      },
    });

    return this.format(updated);
  }

  async getUserRecommendations(userId: string) {
    const recs = await this.prisma.recommendation.findMany({
      where: { recipientId: userId, status: 'ACCEPTED' },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            profile: { select: { headlineEn: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return recs.map((r) => this.format(r));
  }

  private format(rec: any) {
    return {
      id: rec.id,
      authorId: rec.authorId,
      recipientId: rec.recipientId,
      content: rec.content,
      relationship: rec.relationship,
      status: rec.status,
      author: rec.author ? {
        id: rec.author.id,
        displayName: rec.author.displayName,
        headlineEn: rec.author.profile?.headlineEn ?? null,
        avatarUrl: rec.author.profile?.avatarUrl ?? null,
      } : undefined,
      createdAt: rec.createdAt instanceof Date ? rec.createdAt.toISOString() : rec.createdAt,
    };
  }
}
