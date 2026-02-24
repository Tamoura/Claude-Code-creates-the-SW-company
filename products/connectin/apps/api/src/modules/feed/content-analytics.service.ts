import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../lib/errors';

export class ContentAnalyticsService {
  constructor(private readonly prisma: PrismaClient) {}

  async recordView(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isDeleted: true },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    await this.prisma.postView.create({
      data: { postId, userId },
    });

    return { recorded: true };
  }

  async getAnalytics(postId: string, requesterId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        isDeleted: true,
        likeCount: true,
        commentCount: true,
        repostCount: true,
      },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    if (post.authorId !== requesterId) {
      throw new ForbiddenError('Only the post author can view analytics');
    }

    const viewCount = await this.prisma.postView.count({
      where: { postId },
    });

    const reactionCount = await this.prisma.reaction.count({
      where: { postId },
    });

    return {
      viewCount,
      reactionCount,
      commentCount: post.commentCount,
      repostCount: post.repostCount,
      likeCount: post.likeCount,
    };
  }
}
