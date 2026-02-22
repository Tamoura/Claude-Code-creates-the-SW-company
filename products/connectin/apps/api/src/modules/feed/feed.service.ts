import { PrismaClient, TextDirection } from '@prisma/client';
import { NotFoundError } from '../../lib/errors';
import {
  CreatePostInput,
  CreateCommentInput,
} from './feed.schemas';
import {
  decodeCursor,
  encodeCursor,
  CursorPaginationMeta,
} from '../../lib/pagination';

export class FeedService {
  constructor(private readonly prisma: PrismaClient) {}

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
      isLikedByMe: false,
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
    });

    if (!post || post.isDeleted) {
      throw new NotFoundError('Post not found');
    }

    // Upsert-like: try to create, ignore if already exists
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

    await this.prisma.$transaction([
      this.prisma.like.create({
        data: { postId, userId },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    const updated = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { likeCount: true },
    });

    return {
      liked: true,
      likeCount: updated!.likeCount,
    };
  }

  async unlikePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
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

    await this.prisma.$transaction([
      this.prisma.like.delete({
        where: { id: existingLike.id },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: {
          likeCount: { decrement: 1 },
        },
      }),
    ]);

    const updated = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { likeCount: true },
    });

    return {
      liked: false,
      likeCount: Math.max(0, updated!.likeCount),
    };
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
}
