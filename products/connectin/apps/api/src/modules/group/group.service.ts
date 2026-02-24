import {
  PrismaClient,
  GroupPrivacy,
  GroupMemberRole,
} from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../lib/errors';

export class GroupService {
  constructor(private readonly prisma: PrismaClient) {}

  async createGroup(
    userId: string,
    input: {
      name: string;
      description?: string;
      privacy?: string;
    }
  ) {
    const group = await this.prisma.group.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        privacy: (input.privacy as GroupPrivacy) ?? GroupPrivacy.PUBLIC,
        creatorId: userId,
        members: {
          create: {
            userId,
            role: GroupMemberRole.OWNER,
          },
        },
      },
    });

    return group;
  }

  async listGroups() {
    return this.prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async joinGroup(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    return this.prisma.groupMember.upsert({
      where: {
        groupId_userId: { groupId, userId },
      },
      create: {
        groupId,
        userId,
        role: GroupMemberRole.MEMBER,
      },
      update: {},
    });
  }

  async leaveGroup(groupId: string, userId: string) {
    await this.prisma.groupMember.deleteMany({
      where: { groupId, userId },
    });
  }

  async listMembers(groupId: string) {
    return this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  async createPost(
    groupId: string,
    userId: string,
    input: { content: string }
  ) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, privacy: true },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    if (group.privacy === GroupPrivacy.PRIVATE) {
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          groupId_userId: { groupId, userId },
        },
        select: { id: true },
      });

      if (!membership) {
        throw new ForbiddenError(
          'You must be a member to post in this group'
        );
      }
    }

    return this.prisma.groupPost.create({
      data: {
        groupId,
        authorId: userId,
        content: input.content,
      },
    });
  }

  async listPosts(groupId: string, limit: number, offset: number) {
    return this.prisma.groupPost.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}
