import {
  PrismaClient,
  TextDirection,
  ReactionType,
} from '@prisma/client';
import { NotFoundError } from '../../lib/errors';
import {
  CreatePostInput,
  UpdatePostInput,
  CreateCommentInput,
} from './feed.schemas';
import {
  decodeCursor,
  encodeCursor,
  CursorPaginationMeta,
} from '../../lib/pagination';
import { HashtagService } from '../hashtag/hashtag.service';
import { MentionService } from '../mention/mention.service';

export class FeedService {
  private hashtagService: HashtagService;
  private mentionService: MentionService;

  constructor(private readonly prisma: PrismaClient) {
    this.hashtagService = new HashtagService(prisma);
    this.mentionService = new MentionService(prisma);
  }

  async createPost(authorId: string, input: CreatePostInput) {
    const post = await this.prisma.post.create({
      data: {
        authorId,
        content: input.content,
        textDirection:
          input.textDirection as TextDirection,
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: {
                avatarUrl: true,
                headlineEn: true,
              },
            },
          },
        },
      },
    });

    // Extract and link hashtags
    const hashtags = this.hashtagService.extractHashtags(
      input.content
    );
    await this.hashtagService.linkHashtagsToPost(
      post.id,
      hashtags
    );

    // Extract and create mentions
    const mentions =
      await this.mentionService.resolveAndCreateMentions(
        input.content,
        authorId,
        post.id
      );

    return {
      id: post.id,
      author: {
        id: post.author.id,
        displayName: post.author.displayName,
        avatarUrl: post.author.profile?.avatarUrl ?? null,
        headlineEn:
          post.author.profile?.headlineEn ?? null,
      },
      content: post.content,
      textDirection: post.textDirection,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      repostCount: post.repostCount,
      isLikedByMe: false,
      hashtags,
      mentions: mentions.map((m) => ({
        userId: m.userId,
        displayName: m.displayName,
        offsetStart: m.offsetStart,
        offsetEnd: m.offsetEnd,
      })),
      createdAt: post.createdAt,
    };
  }

  async getFeed(
    userId: string,
    query: { cursor?: string; limit?: string }
  ) {
    const limit = Math.min(
      50,
      Math.max(1, parseInt(query.limit || '10', 10) || 10)
    );

    const cursorData = query.cursor
      ? decodeCursor(query.cursor)
      : null;

    // MVP feed: chronological, all posts
    const whereClause = cursorData
      ? {
          isDeleted: false,
          OR: [
            {
              createdAt: { lt: cursorData.createdAt },
            },
            {
              createdAt: cursorData.createdAt,
              id: { lt: cursorData.id },
            },
          ],
        }
      : { isDeleted: false };

    const posts = await this.prisma.post.findMany({
      where: whereClause,
      take: limit + 1,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: {
                avatarUrl: true,
                headlineEn: true,
              },
            },
          },
        },
        likes: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    const hasMore = posts.length > limit;
    const resultPosts = hasMore
      ? posts.slice(0, limit)
      : posts;

    const lastPost =
      resultPosts.length > 0
        ? resultPosts[resultPosts.length - 1]
        : null;

    const meta: CursorPaginationMeta = {
      cursor: lastPost
        ? encodeCursor(lastPost.createdAt, lastPost.id)
        : null,
      hasMore,
      count: resultPosts.length,
    };

    const data = resultPosts.map((post) => ({
      id: post.id,
      author: {
        id: post.author.id,
        displayName: post.author.displayName,
        avatarUrl:
          post.author.profile?.avatarUrl ?? null,
        headlineEn:
          post.author.profile?.headlineEn ?? null,
      },
      content: post.content,
      textDirection: post.textDirection,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      isLikedByMe: post.likes.length > 0,
      createdAt: post.createdAt,
    }));

    return { data, meta };
  }

  async likePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isDeleted: true, likeCount: true },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    // Check if already liked (idempotent)
    const existingLike =
      await this.prisma.like.findUnique({
        where: {
          postId_userId: { postId, userId },
        },
      });

    if (existingLike) {
      return {
        liked: true,
        likeCount: post.likeCount,
      };
    }

    // Create like and increment count in a single transaction
    const [, updatedPost] = await this.prisma.$transaction([
      this.prisma.like.create({
        data: { postId, userId },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      }),
    ]);

    return {
      liked: true,
      likeCount: updatedPost.likeCount,
    };
  }

  async unlikePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isDeleted: true, likeCount: true },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    const existingLike =
      await this.prisma.like.findUnique({
        where: {
          postId_userId: { postId, userId },
        },
      });

    if (!existingLike) {
      return {
        liked: false,
        likeCount: post.likeCount,
      };
    }

    // Delete like and decrement count in a single transaction
    const [, updatedPost] = await this.prisma.$transaction([
      this.prisma.like.delete({
        where: { id: existingLike.id },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: {
          likeCount: { decrement: 1 },
        },
        select: { likeCount: true },
      }),
    ]);

    return {
      liked: false,
      likeCount: Math.max(0, updatedPost.likeCount),
    };
  }

  async editPost(
    postId: string,
    userId: string,
    input: UpdatePostInput
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        isDeleted: true,
      },
    });

    if (!post || post.isDeleted || post.authorId !== userId) {
      throw new NotFoundError('Post not found');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        content: input.content,
        ...(input.textDirection && {
          textDirection:
            input.textDirection as import('@prisma/client').TextDirection,
        }),
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: {
                avatarUrl: true,
                headlineEn: true,
              },
            },
          },
        },
        likes: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    return {
      id: updated.id,
      author: {
        id: updated.author.id,
        displayName: updated.author.displayName,
        avatarUrl:
          updated.author.profile?.avatarUrl ?? null,
        headlineEn:
          updated.author.profile?.headlineEn ?? null,
      },
      content: updated.content,
      textDirection: updated.textDirection,
      likeCount: updated.likeCount,
      commentCount: updated.commentCount,
      isLikedByMe: updated.likes.length > 0,
      createdAt: updated.createdAt,
    };
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        isDeleted: true,
      },
    });

    if (!post || post.isDeleted || post.authorId !== userId) {
      throw new NotFoundError('Post not found');
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { isDeleted: true },
    });

    return { deleted: true };
  }

  async getComments(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isDeleted: true },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    const comments = await this.prisma.comment.findMany(
      {
        where: {
          postId,
          isDeleted: false,
        },
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }
    );

    return comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      authorId: c.authorId,
      authorName: c.author.displayName,
      avatarUrl: c.author.profile?.avatarUrl ?? null,
      content: c.content,
      textDirection: c.textDirection,
      createdAt: c.createdAt,
    }));
  }

  async addComment(
    postId: string,
    authorId: string,
    input: CreateCommentInput
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: {
          postId,
          authorId,
          content: input.content,
          textDirection:
            input.textDirection as TextDirection,
        },
        include: {
          author: {
            select: { displayName: true },
          },
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    // Extract mentions from comment
    await this.mentionService.resolveAndCreateMentions(
      input.content,
      authorId,
      undefined,
      comment.id
    );

    return {
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      authorName: comment.author.displayName,
      content: comment.content,
      textDirection: comment.textDirection,
      createdAt: comment.createdAt,
    };
  }

  async repostPost(
    postId: string,
    userId: string,
    comment?: string
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isDeleted: true },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    await this.prisma.repost.upsert({
      where: {
        originalPostId_userId: {
          originalPostId: postId,
          userId,
        },
      },
      create: {
        originalPostId: postId,
        userId,
        comment: comment ?? null,
      },
      update: {
        comment: comment ?? null,
      },
    });

    // Recount reposts for accuracy
    const repostCount = await this.prisma.repost.count({
      where: { originalPostId: postId },
    });

    await this.prisma.post.update({
      where: { id: postId },
      data: { repostCount },
    });

    return {
      originalPostId: postId,
      comment: comment ?? null,
      repostCount,
    };
  }

  async removeRepost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isDeleted: true },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    await this.prisma.repost.deleteMany({
      where: { originalPostId: postId, userId },
    });

    const repostCount = await this.prisma.repost.count({
      where: { originalPostId: postId },
    });

    await this.prisma.post.update({
      where: { id: postId },
      data: { repostCount },
    });

    return { repostCount };
  }

  private emptyReactions() {
    return {
      LIKE: 0,
      CELEBRATE: 0,
      SUPPORT: 0,
      LOVE: 0,
      INSIGHTFUL: 0,
      FUNNY: 0,
    };
  }

  private async getReactionCounts(postId: string) {
    const counts = await this.prisma.reaction.groupBy({
      by: ['type'],
      where: { postId },
      _count: true,
    });
    const result = this.emptyReactions();
    for (const c of counts) {
      result[c.type] = c._count;
    }
    return result;
  }

  async reactToPost(
    postId: string,
    userId: string,
    type: ReactionType
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isDeleted: true },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    await this.prisma.reaction.upsert({
      where: {
        postId_userId: { postId, userId },
      },
      create: { postId, userId, type },
      update: { type },
    });

    const reactions = await this.getReactionCounts(postId);

    return {
      reacted: true,
      type,
      reactions,
    };
  }

  async unreactToPost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isDeleted: true },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    await this.prisma.reaction.deleteMany({
      where: { postId, userId },
    });

    const reactions = await this.getReactionCounts(postId);

    return {
      reacted: false,
      reactions,
    };
  }

  async getPostReactions(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isDeleted: true },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    return this.getReactionCounts(postId);
  }
}
