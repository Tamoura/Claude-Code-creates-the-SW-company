import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../lib/errors';
import {
  UpdateProfileInput,
  AddExperienceInput,
  AddSkillsInput,
} from './profile.schemas';

export class ProfileService {
  constructor(private readonly prisma: PrismaClient) {}

  async getMyProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        experiences: {
          orderBy: [
            { isCurrent: 'desc' },
            { startDate: 'desc' },
          ],
        },
        profileSkills: {
          include: { skill: true },
        },
        user: {
          select: { displayName: true },
        },
      },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    return this.formatProfile(profile);
  }

  async getProfileById(profileUserId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: profileUserId },
      include: {
        experiences: {
          orderBy: [
            { isCurrent: 'desc' },
            { startDate: 'desc' },
          ],
        },
        profileSkills: {
          include: { skill: true },
        },
        user: {
          select: { displayName: true },
        },
      },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    return this.formatProfile(profile);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const updated = await this.prisma.profile.update({
      where: { userId },
      data: {
        ...input,
        completenessScore: this.calculateCompleteness({
          ...profile,
          ...input,
        }),
      },
    });

    return updated;
  }

  async addExperience(
    userId: string,
    input: AddExperienceInput
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const experience = await this.prisma.experience.create({
      data: {
        profileId: profile.id,
        company: input.company,
        title: input.title,
        location: input.location,
        description: input.description,
        startDate: new Date(input.startDate),
        endDate: input.endDate
          ? new Date(input.endDate)
          : null,
        isCurrent: input.isCurrent,
      },
    });

    // Recalculate completeness
    await this.recalculateCompleteness(profile.id);

    return experience;
  }

  async addSkills(userId: string, input: AddSkillsInput) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    // Remove existing skills
    await this.prisma.profileSkill.deleteMany({
      where: { profileId: profile.id },
    });

    // Add new skills
    const skillRecords = input.skillIds.map((skillId) => ({
      profileId: profile.id,
      skillId,
    }));

    await this.prisma.profileSkill.createMany({
      data: skillRecords,
      skipDuplicates: true,
    });

    // Recalculate completeness
    await this.recalculateCompleteness(profile.id);

    const skills = await this.prisma.profileSkill.findMany({
      where: { profileId: profile.id },
      include: { skill: true },
    });

    return skills.map((ps) => ({
      id: ps.skill.id,
      nameEn: ps.skill.nameEn,
      nameAr: ps.skill.nameAr,
      endorsementCount: ps.endorsementCount,
    }));
  }

  private calculateCompleteness(profile: {
    headlineAr?: string | null;
    headlineEn?: string | null;
    summaryAr?: string | null;
    summaryEn?: string | null;
    avatarUrl?: string | null;
    location?: string | null;
    website?: string | null;
  }): number {
    let score = 0;
    const weights = {
      headlineAr: 10,
      headlineEn: 10,
      summaryAr: 10,
      summaryEn: 10,
      avatarUrl: 15,
      location: 10,
      website: 5,
    };

    for (const [key, weight] of Object.entries(weights)) {
      if (
        profile[key as keyof typeof weights] &&
        String(profile[key as keyof typeof weights]).trim()
          .length > 0
      ) {
        score += weight;
      }
    }

    return Math.min(100, score);
  }

  private async recalculateCompleteness(
    profileId: string
  ): Promise<void> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        experiences: true,
        profileSkills: true,
      },
    });

    if (!profile) return;

    let score = this.calculateCompleteness(profile);

    // Add points for experiences
    if (profile.experiences.length > 0) {
      score += 15;
    }

    // Add points for skills
    if (profile.profileSkills.length > 0) {
      score += 15;
    }

    score = Math.min(100, score);

    await this.prisma.profile.update({
      where: { id: profileId },
      data: { completenessScore: score },
    });
  }

  private formatProfile(profile: {
    id: string;
    userId: string;
    headlineAr: string | null;
    headlineEn: string | null;
    summaryAr: string | null;
    summaryEn: string | null;
    avatarUrl: string | null;
    location: string | null;
    website: string | null;
    completenessScore: number;
    createdAt: Date;
    updatedAt: Date;
    user: { displayName: string };
    experiences: Array<{
      id: string;
      company: string;
      title: string;
      location: string | null;
      description: string | null;
      startDate: Date;
      endDate: Date | null;
      isCurrent: boolean;
    }>;
    profileSkills: Array<{
      endorsementCount: number;
      skill: {
        id: string;
        nameEn: string;
        nameAr: string | null;
      };
    }>;
  }) {
    return {
      id: profile.id,
      userId: profile.userId,
      displayName: profile.user.displayName,
      headlineAr: profile.headlineAr,
      headlineEn: profile.headlineEn,
      summaryAr: profile.summaryAr,
      summaryEn: profile.summaryEn,
      avatarUrl: profile.avatarUrl,
      location: profile.location,
      website: profile.website,
      completenessScore: profile.completenessScore,
      experiences: profile.experiences.map((e) => ({
        id: e.id,
        company: e.company,
        title: e.title,
        location: e.location,
        description: e.description,
        startDate: e.startDate,
        endDate: e.endDate,
        isCurrent: e.isCurrent,
      })),
      skills: profile.profileSkills.map((ps) => ({
        id: ps.skill.id,
        nameEn: ps.skill.nameEn,
        nameAr: ps.skill.nameAr,
        endorsementCount: ps.endorsementCount,
      })),
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
