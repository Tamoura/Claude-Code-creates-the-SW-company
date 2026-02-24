import { PrismaClient } from '@prisma/client';

export class ProfileViewsService {
  constructor(private readonly prisma: PrismaClient) {}

  async recordView(viewerId: string, viewedUserId: string) {
    // Don't record self-views
    if (viewerId === viewedUserId) {
      return;
    }

    await this.prisma.profileView.create({
      data: {
        viewerId,
        viewedUserId,
      },
    });
  }

  async getViewers(userId: string, limit = 20) {
    const views = await this.prisma.profileView.findMany({
      where: { viewedUserId: userId },
      orderBy: { viewedAt: 'desc' },
      take: limit,
      include: {
        viewer: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: {
                headlineEn: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return views.map((v) => ({
      viewerId: v.viewerId,
      viewedAt: v.viewedAt,
      viewer: {
        id: v.viewer.id,
        displayName: v.viewer.displayName,
        headlineEn: v.viewer.profile?.headlineEn ?? null,
        avatarUrl: v.viewer.profile?.avatarUrl ?? null,
      },
    }));
  }

  async getViewCount(userId: string) {
    const count = await this.prisma.profileView.count({
      where: { viewedUserId: userId },
    });
    return { count };
  }
}
