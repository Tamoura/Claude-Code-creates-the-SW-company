import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../lib/errors';
import {
  UpdateProfileInput,
  AddExperienceInput,
  UpdateExperienceInput,
  AddSkillsInput,
  AddEducationInput,
  UpdateEducationInput,
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
        educations: {
          orderBy: { startYear: 'desc' },
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

  /**
   * Get a profile by user ID.
   *
   * Visibility: profiles are publicly viewable by any authenticated
   * user (by design -- this is a professional networking platform,
   * similar to LinkedIn). Sensitive fields such as email are only
   * fetched from the DB when the requester is the profile owner.
   */
  async getProfileById(
    profileUserId: string,
    requesterId: string
  ) {
    const isOwner = profileUserId === requesterId;

    // Block access to profiles of deleted/suspended users (RISK-004)
    if (!isOwner) {
      const user = await this.prisma.user.findUnique({
        where: { id: profileUserId },
        select: { status: true },
      });
      if (!user || user.status !== 'ACTIVE') {
        throw new NotFoundError('Profile not found');
      }
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId: profileUserId },
      include: {
        experiences: {
          orderBy: [
            { isCurrent: 'desc' },
            { startDate: 'desc' },
          ],
        },
        educations: {
          orderBy: { startYear: 'desc' },
        },
        profileSkills: {
          include: { skill: true },
        },
        user: {
          select: {
            displayName: true,
            // Only fetch PII fields when the requester is the owner
            ...(isOwner && { email: true }),
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const formatted = this.formatProfile(profile);

    if (!isOwner) {
      return {
        ...formatted,
        email: undefined,
        website: undefined,
      };
    }

    return {
      ...formatted,
      email: (profile.user as { displayName: string; email?: string }).email,
    };
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

  async updateExperience(
    userId: string,
    experienceId: string,
    input: UpdateExperienceInput
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    // Find experience and verify ownership
    const experience = await this.prisma.experience.findUnique(
      { where: { id: experienceId } }
    );

    if (!experience || experience.profileId !== profile.id) {
      throw new NotFoundError('Experience not found');
    }

    const data: Record<string, unknown> = {};
    if (input.company !== undefined) data.company = input.company;
    if (input.title !== undefined) data.title = input.title;
    if (input.location !== undefined)
      data.location = input.location;
    if (input.description !== undefined)
      data.description = input.description;
    if (input.startDate !== undefined)
      data.startDate = new Date(input.startDate);
    if (input.endDate !== undefined)
      data.endDate = input.endDate
        ? new Date(input.endDate)
        : null;
    if (input.isCurrent !== undefined)
      data.isCurrent = input.isCurrent;

    const updated = await this.prisma.experience.update({
      where: { id: experienceId },
      data,
    });

    return updated;
  }

  async deleteExperience(
    userId: string,
    experienceId: string
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    // Find experience and verify ownership
    const experience = await this.prisma.experience.findUnique(
      { where: { id: experienceId } }
    );

    if (!experience || experience.profileId !== profile.id) {
      throw new NotFoundError('Experience not found');
    }

    await this.prisma.experience.delete({
      where: { id: experienceId },
    });

    // Recalculate completeness after deletion
    await this.recalculateCompleteness(profile.id);

    return { success: true };
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

  async addEducation(
    userId: string,
    input: AddEducationInput
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const education = await this.prisma.education.create({
      data: {
        profileId: profile.id,
        institution: input.institution,
        degree: input.degree,
        fieldOfStudy: input.fieldOfStudy,
        description: input.description,
        startYear: input.startYear,
        endYear: input.endYear,
      },
    });

    await this.recalculateCompleteness(profile.id);

    return education;
  }

  async updateEducation(
    userId: string,
    educationId: string,
    input: UpdateEducationInput
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const education = await this.prisma.education.findUnique({
      where: { id: educationId },
    });

    if (!education || education.profileId !== profile.id) {
      throw new NotFoundError('Education entry not found');
    }

    const updated = await this.prisma.education.update({
      where: { id: educationId },
      data: {
        ...(input.institution !== undefined && {
          institution: input.institution,
        }),
        ...(input.degree !== undefined && {
          degree: input.degree,
        }),
        ...(input.fieldOfStudy !== undefined && {
          fieldOfStudy: input.fieldOfStudy,
        }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.startYear !== undefined && {
          startYear: input.startYear,
        }),
        ...(input.endYear !== undefined && {
          endYear: input.endYear,
        }),
      },
    });

    return updated;
  }

  async deleteEducation(
    userId: string,
    educationId: string
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const education = await this.prisma.education.findUnique({
      where: { id: educationId },
    });

    if (!education || education.profileId !== profile.id) {
      throw new NotFoundError('Education entry not found');
    }

    await this.prisma.education.delete({
      where: { id: educationId },
    });

    await this.recalculateCompleteness(profile.id);

    return { deleted: true };
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
        educations: true,
        profileSkills: true,
      },
    });

    if (!profile) return;

    let score = this.calculateCompleteness(profile);

    // Add points for experiences
    if (profile.experiences.length > 0) {
      score += 15;
    }

    // Add points for education
    if (profile.educations.length > 0) {
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
    educations: Array<{
      id: string;
      institution: string;
      degree: string;
      fieldOfStudy: string | null;
      description: string | null;
      startYear: number;
      endYear: number | null;
      sortOrder: number;
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
      education: profile.educations.map((ed) => ({
        id: ed.id,
        institution: ed.institution,
        degree: ed.degree,
        fieldOfStudy: ed.fieldOfStudy,
        description: ed.description,
        startYear: ed.startYear,
        endYear: ed.endYear,
        sortOrder: ed.sortOrder,
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
