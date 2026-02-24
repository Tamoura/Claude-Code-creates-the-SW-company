import { PrismaClient } from '@prisma/client';

export class MutualConnectionsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getMutualConnections(userId: string, otherUserId: string) {
    // Get accepted connections for both users
    const [myConnections, theirConnections] = await Promise.all([
      this.getAcceptedConnectionIds(userId),
      this.getAcceptedConnectionIds(otherUserId),
    ]);

    const mySet = new Set(myConnections);
    const mutualIds = theirConnections.filter((id) => mySet.has(id));

    if (mutualIds.length === 0) {
      return { count: 0, users: [] };
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: mutualIds } },
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
    });

    return {
      count: users.length,
      users: users.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        headlineEn: u.profile?.headlineEn ?? null,
        avatarUrl: u.profile?.avatarUrl ?? null,
      })),
    };
  }

  async getConnectionDegree(userId: string, targetId: string): Promise<number | null> {
    if (userId === targetId) return 0;

    // BFS up to 3 hops
    const visited = new Set<string>([userId]);
    let frontier = [userId];

    for (let degree = 1; degree <= 3; degree++) {
      const nextFrontier: string[] = [];

      for (const id of frontier) {
        const connections = await this.getAcceptedConnectionIds(id);
        for (const connId of connections) {
          if (connId === targetId) return degree;
          if (!visited.has(connId)) {
            visited.add(connId);
            nextFrontier.push(connId);
          }
        }
      }

      frontier = nextFrontier;
      if (frontier.length === 0) break;
    }

    return null;
  }

  private async getAcceptedConnectionIds(userId: string): Promise<string[]> {
    const connections = await this.prisma.connection.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      select: { senderId: true, receiverId: true },
    });

    return connections.map((c) =>
      c.senderId === userId ? c.receiverId : c.senderId
    );
  }
}
