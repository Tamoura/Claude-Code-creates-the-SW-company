import { PrismaClient } from '@prisma/client';
import {
  ValidationError,
  NotFoundError,
} from '../../lib/errors';

export class EndorsementService {
  constructor(private readonly prisma: PrismaClient) {}

  async endorseSkill(
    endorserId: string,
    profileSkillId: string
  ) {
    const profileSkill =
      await this.prisma.profileSkill.findUnique({
        where: { id: profileSkillId },
        include: {
          profile: {
            select: { userId: true },
          },
        },
      });

    if (!profileSkill) {
      throw new NotFoundError('Profile skill not found');
    }

    if (profileSkill.profile.userId === endorserId) {
      throw new ValidationError(
        'Cannot endorse your own skill',
        [
          {
            field: 'profileSkillId',
            message: 'Cannot endorse your own skill',
          },
        ]
      );
    }

    await this.prisma.endorsement.upsert({
      where: {
        endorserId_profileSkillId: {
          endorserId,
          profileSkillId,
        },
      },
      create: { endorserId, profileSkillId },
      update: {},
    });

    const endorsementCount =
      await this.prisma.endorsement.count({
        where: { profileSkillId },
      });

    await this.prisma.profileSkill.update({
      where: { id: profileSkillId },
      data: { endorsementCount },
    });

    return {
      endorsed: true,
      endorsementCount,
    };
  }

  async removeEndorsement(
    endorserId: string,
    profileSkillId: string
  ) {
    await this.prisma.endorsement.deleteMany({
      where: { endorserId, profileSkillId },
    });

    const endorsementCount =
      await this.prisma.endorsement.count({
        where: { profileSkillId },
      });

    await this.prisma.profileSkill.update({
      where: { id: profileSkillId },
      data: { endorsementCount },
    });

    return {
      endorsed: false,
      endorsementCount,
    };
  }

  async getEndorsersForSkill(profileSkillId: string) {
    const endorsements =
      await this.prisma.endorsement.findMany({
        where: { profileSkillId },
        include: {
          endorser: {
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
      });

    return {
      endorsers: endorsements.map((e) => ({
        id: e.endorser.id,
        displayName: e.endorser.displayName,
        avatarUrl:
          e.endorser.profile?.avatarUrl ?? null,
        endorsedAt: e.createdAt,
      })),
    };
  }

  async getMyEndorsements(endorserId: string) {
    const endorsements =
      await this.prisma.endorsement.findMany({
        where: { endorserId },
        include: {
          profileSkill: {
            include: {
              skill: {
                select: { nameEn: true },
              },
              profile: {
                select: {
                  user: {
                    select: { displayName: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

    return {
      endorsements: endorsements.map((e) => ({
        profileSkillId: e.profileSkillId,
        skillName: e.profileSkill.skill.nameEn,
        profileOwnerName:
          e.profileSkill.profile.user.displayName,
        endorsedAt: e.createdAt,
      })),
    };
  }
}
