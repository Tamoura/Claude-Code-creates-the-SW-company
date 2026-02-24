import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';

export class GroupMessagingService {
  constructor(private readonly prisma: PrismaClient) {}

  async createGroup(adminId: string, input: { name: string; memberIds: string[] }) {
    if (!input.memberIds || input.memberIds.length < 2) {
      throw new ValidationError('A group requires at least 2 other members', [
        { field: 'memberIds', message: 'At least 2 member IDs required' },
      ]);
    }

    // Deduplicate and exclude the admin
    const uniqueMembers = [...new Set(input.memberIds.filter((id) => id !== adminId))];
    if (uniqueMembers.length < 2) {
      throw new ValidationError('A group requires at least 2 other members', [
        { field: 'memberIds', message: 'At least 2 distinct member IDs required' },
      ]);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        isGroup: true,
        name: input.name,
        adminId: adminId,
        members: {
          create: [
            { userId: adminId },
            ...uniqueMembers.map((id) => ({ userId: id })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, displayName: true },
            },
          },
        },
      },
    });

    return {
      id: conversation.id,
      isGroup: conversation.isGroup,
      name: conversation.name,
      adminId: conversation.adminId,
      memberCount: conversation.members.length,
      members: conversation.members.map((m) => ({
        userId: m.user.id,
        displayName: m.user.displayName,
      })),
      createdAt: conversation.createdAt.toISOString(),
    };
  }

  async addMember(conversationId: string, requesterId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });
    if (!conversation) throw new NotFoundError('Group not found');
    if (!conversation.isGroup) throw new ForbiddenError('Not a group conversation');
    if (conversation.adminId !== requesterId) throw new ForbiddenError('Only the admin can add members');

    // Check if already a member
    const existing = conversation.members.find((m) => m.userId === userId);
    if (existing) return { added: true };

    await this.prisma.conversationMember.create({
      data: { conversationId, userId },
    });

    return { added: true };
  }

  async removeMember(conversationId: string, requesterId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundError('Group not found');
    if (!conversation.isGroup) throw new ForbiddenError('Not a group conversation');
    if (conversation.adminId !== requesterId) throw new ForbiddenError('Only the admin can remove members');

    await this.prisma.conversationMember.deleteMany({
      where: { conversationId, userId },
    });

    return { removed: true };
  }

  async leaveGroup(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new ForbiddenError('Not a member of this group');

    await this.prisma.conversationMember.delete({
      where: { conversationId_userId: { conversationId, userId } },
    });

    return { left: true };
  }
}
