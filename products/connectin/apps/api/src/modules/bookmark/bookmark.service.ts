import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../lib/errors';

export class BookmarkService {
  constructor(private readonly prisma: PrismaClient) {}

  async addBookmark(userId: string, input: { postId?: string; jobId?: string }) {
    // Verify the target exists
    if (input.postId) {
      const post = await this.prisma.post.findUnique({
        where: { id: input.postId },
        select: { id: true, isDeleted: true },
      });
      if (!post || post.isDeleted) {
        throw new NotFoundError('Post not found');
      }

      const existing = await this.prisma.bookmark.findUnique({
        where: { userId_postId: { userId, postId: input.postId } },
      });
      if (existing) {
        return { id: existing.id, postId: existing.postId, jobId: existing.jobId, createdAt: existing.createdAt, isNew: false };
      }
    }

    if (input.jobId) {
      const job = await this.prisma.job.findUnique({
        where: { id: input.jobId },
        select: { id: true },
      });
      if (!job) {
        throw new NotFoundError('Job not found');
      }

      const existing = await this.prisma.bookmark.findUnique({
        where: { userId_jobId: { userId, jobId: input.jobId } },
      });
      if (existing) {
        return { id: existing.id, postId: existing.postId, jobId: existing.jobId, createdAt: existing.createdAt, isNew: false };
      }
    }

    const bookmark = await this.prisma.bookmark.create({
      data: {
        userId,
        postId: input.postId || null,
        jobId: input.jobId || null,
      },
    });

    return {
      id: bookmark.id,
      postId: bookmark.postId,
      jobId: bookmark.jobId,
      createdAt: bookmark.createdAt,
      isNew: true,
    };
  }

  async listBookmarks(userId: string) {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            authorId: true,
            createdAt: true,
            isDeleted: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
          },
        },
      },
    });

    return bookmarks
      .filter((b) => !(b.post && b.post.isDeleted))
      .map((b) => ({
        id: b.id,
        postId: b.postId,
        jobId: b.jobId,
        post: b.post ? {
          id: b.post.id,
          content: b.post.content,
          authorId: b.post.authorId,
          createdAt: b.post.createdAt,
        } : null,
        job: b.job,
        createdAt: b.createdAt,
      }));
  }

  async removeBookmark(bookmarkId: string, userId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!bookmark || bookmark.userId !== userId) {
      throw new NotFoundError('Bookmark not found');
    }

    await this.prisma.bookmark.delete({
      where: { id: bookmarkId },
    });

    return { deleted: true };
  }
}
