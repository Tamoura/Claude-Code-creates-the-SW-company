import { PrismaClient } from '@prisma/client';
import { ValidationError } from '../../lib/errors';

export class FollowService {
  constructor(private readonly prisma: PrismaClient) {}

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new ValidationError('Cannot follow yourself', [
        { field: 'userId', message: 'Cannot follow yourself' },
      ]);
    }

    await this.prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
      create: { followerId, followingId },
      update: {},
    });

    return { following: true };
  }

  async unfollowUser(followerId: string, followingId: string) {
    await this.prisma.follow.deleteMany({
      where: { followerId, followingId },
    });

    return { following: false };
  }

  async getFollowers(
    userId: string,
    limit = 20,
    offset = 0
  ) {
    const followers = await this.prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: { avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return followers.map((f) => ({
      id: f.follower.id,
      displayName: f.follower.displayName,
      avatarUrl: f.follower.profile?.avatarUrl ?? null,
      followedAt: f.createdAt,
    }));
  }

  async getFollowing(
    userId: string,
    limit = 20,
    offset = 0
  ) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: { avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return following.map((f) => ({
      id: f.following.id,
      displayName: f.following.displayName,
      avatarUrl: f.following.profile?.avatarUrl ?? null,
      followedAt: f.createdAt,
    }));
  }

  async getFollowStatus(
    followerId: string,
    followingId: string
  ) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return { following: !!follow };
  }

  async getFollowCounts(userId: string) {
    const [followers, following] = await Promise.all([
      this.prisma.follow.count({
        where: { followingId: userId },
      }),
      this.prisma.follow.count({
        where: { followerId: userId },
      }),
    ]);

    return { followers, following };
  }
}
