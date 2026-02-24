import { PrismaClient } from '@prisma/client';

const HASHTAG_REGEX = /#([a-zA-Z0-9_\u0600-\u06FF]+)/g;

export class HashtagService {
  constructor(private readonly prisma: PrismaClient) {}

  extractHashtags(content: string): string[] {
    const matches = content.matchAll(HASHTAG_REGEX);
    const tags = new Set<string>();
    for (const match of matches) {
      tags.add(match[1].toLowerCase());
    }
    return Array.from(tags);
  }

  async linkHashtagsToPost(
    postId: string,
    tags: string[]
  ): Promise<void> {
    if (tags.length === 0) return;

    for (const tag of tags) {
      const hashtag = await this.prisma.hashtag.upsert({
        where: { tag },
        create: { tag, postCount: 1 },
        update: { postCount: { increment: 1 } },
      });

      await this.prisma.postHashtag.upsert({
        where: {
          postId_hashtagId: {
            postId,
            hashtagId: hashtag.id,
          },
        },
        create: { postId, hashtagId: hashtag.id },
        update: {},
      });
    }
  }

  async unlinkHashtagsFromPost(
    postId: string
  ): Promise<void> {
    const links = await this.prisma.postHashtag.findMany({
      where: { postId },
      select: { hashtagId: true },
    });

    if (links.length === 0) return;

    await this.prisma.postHashtag.deleteMany({
      where: { postId },
    });

    for (const link of links) {
      await this.prisma.hashtag.update({
        where: { id: link.hashtagId },
        data: {
          postCount: { decrement: 1 },
        },
      });
    }
  }

  async getTrending(limit: number = 20) {
    const hashtags = await this.prisma.hashtag.findMany({
      where: { postCount: { gt: 0 } },
      orderBy: { postCount: 'desc' },
      take: Math.min(limit, 50),
    });

    return hashtags.map((h) => ({
      id: h.id,
      tag: h.tag,
      postCount: h.postCount,
      isTrending: h.isTrending,
    }));
  }

  async getPostsByTag(
    tag: string,
    limit: number = 20,
    offset: number = 0
  ) {
    const hashtag = await this.prisma.hashtag.findUnique({
      where: { tag: tag.toLowerCase() },
    });

    if (!hashtag) return [];

    const postHashtags =
      await this.prisma.postHashtag.findMany({
        where: { hashtagId: hashtag.id },
        include: {
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  displayName: true,
                  profile: {
                    select: { avatarUrl: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

    return postHashtags
      .filter((ph) => !ph.post.isDeleted)
      .map((ph) => ({
        id: ph.post.id,
        content: ph.post.content,
        textDirection: ph.post.textDirection,
        likeCount: ph.post.likeCount,
        commentCount: ph.post.commentCount,
        repostCount: ph.post.repostCount,
        author: {
          id: ph.post.author.id,
          displayName: ph.post.author.displayName,
          avatarUrl:
            ph.post.author.profile?.avatarUrl ?? null,
        },
        createdAt: ph.post.createdAt,
      }));
  }

  async followHashtag(tag: string, userId: string) {
    const hashtag = await this.prisma.hashtag.upsert({
      where: { tag: tag.toLowerCase() },
      create: { tag: tag.toLowerCase() },
      update: {},
    });

    await this.prisma.hashtagFollow.upsert({
      where: {
        userId_hashtagId: {
          userId,
          hashtagId: hashtag.id,
        },
      },
      create: { userId, hashtagId: hashtag.id },
      update: {},
    });

    return { following: true };
  }

  async unfollowHashtag(tag: string, userId: string) {
    const hashtag = await this.prisma.hashtag.findUnique({
      where: { tag: tag.toLowerCase() },
    });

    if (hashtag) {
      await this.prisma.hashtagFollow.deleteMany({
        where: { userId, hashtagId: hashtag.id },
      });
    }

    return { following: false };
  }
}
